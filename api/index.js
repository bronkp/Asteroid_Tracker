const express = require("express");
require("dotenv").config();
const app = express();
app.use(express.static(__dirname + "/public"));
var path = require("path");
const port = 3000;

//This route returns the days asteroid info from the Vercel Edge Store
app.get("/raw", async (req, res) => {
  //requests data 
  const readSingle = await fetch(
    `https://edge-config.vercel.com/${process.env.EDGE_ID}/item/asteroids?token=${process.env.EDGE_TOKEN}`
  );
  const result = await readSingle.json();
  //returns the JSON
  res.send(JSON.parse(result));
});
//The home route, the javascript on the page will use /raw for its data
app.get("/", async (req, res) => {
  //the home page
  res.sendFile("/home/home.html", { root: path.join(__dirname, "public") });
});
//information about the project and me
app.get("/about", async (req, res) => {
  res.sendFile("/about/about.html", { root: path.join(__dirname, "public") });
});

//This route is what Vercel will use to update the asteroid information nightly
app.get("/cron", async (req, res) => {
  //checks cron key
  const authHeader = req.get("authorization");
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    //Nasa's API queries for spans of days up to one week

    //gets current day
    const today = new Date();
    //makes data into Nasa's format, year-month-day
    const start = `${today.getFullYear()}-${
      today.getMonth() + 1
    }-${today.getDate()}`;
    //finds seven days in the future
    const sevenFuture = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    //makes data into Nasa's format, year-month-day
    const end = `${sevenFuture.getFullYear()}-${
      sevenFuture.getMonth() + 1
    }-${sevenFuture.getDate()}`;
    //requests all the near earth objects for the next 7 days
    const response = await fetch(
      `https://api.nasa.gov/neo/rest/v1/feed?start_date=${start}&end_date=${end}&api_key=${process.env.NASA_KEY}`
    ).then((data) => {
      return data.json();
    });
    let cronResult = "";
    //checking that the request worked
    if (response.near_earth_objects) {
      //the response is grouped by closest approach dates, so first we must put them all in one array to compare 
      const dates = Object.keys(response.near_earth_objects);
      const objects = [];
      //for each date, add every object to the objects array
      dates.map((date) => {
        response.near_earth_objects[date].map((object) => {
          //adds only the relavant information to the objects array
          objects.push({
            name: object.name,
            diameter: object.estimated_diameter.feet,
            isHazard: object.is_potentially_hazardous_asteroid,
            distance: object.close_approach_data[0].miss_distance.miles,
            speed:
              object.close_approach_data[0].relative_velocity.miles_per_hour,
          });
        });
      });
      // gets record asteroids

      //count of all potentially hazardous objects
      let count = 0;
      //diameter of biggest asteroid in feet
      let biggest = { diameter: { estimated_diameter_max: 0 } };
      //distance of closest asteroid in miles
      let closest = { distance: objects[0].distance };
      //distance of closest asteroid in miles per hour
      let fastest = { speed: 0 };

      //For each object
      objects.map((object) => {
        //checking if hazardous to add to total count
        if (object.isHazard == true) {
          count++;
        }
        //checking if this asteroid is larger than the largest seen so far
        if (
          parseInt(object.diameter.estimated_diameter_max) >
          parseInt(biggest.diameter.estimated_diameter_max)
        ) {
          //sets biggest to new biggest
          Object.assign(biggest, object);
        }
        //checking if this asteroid is faster than the fastest seen so far

        if (parseInt(object.speed) > parseInt(fastest.speed)) {
          //sets fastest to new fastest
          Object.assign(fastest, object);
        }
        //checking if this asteroid is closer than the closest seen so far

        if (parseInt(object.distance) < parseInt(closest.distance)) {
          //sets closest to new closest
          Object.assign(closest, object);
        }
      });
      //this is what is actually saved to the edge store and what will be returned by the /raw route
      cronResult = {
        updated: today,
        biggest: biggest,
        fastest: fastest,
        closest: closest,
        total_objects: objects.length,
        hazardous: count,
      };
    }

    try {
      //sets current asteroid records every day
      const updateEdgeConfig = await fetch(
        `https://api.vercel.com/v1/edge-config/${process.env.EDGE_ID}/items`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${process.env.VERCEL_API}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            items: [
              {
                operation: "update",
                key: "asteroids",
                value: JSON.stringify(cronResult),
              },
            ],
          }),
        }
      );
      const result = await updateEdgeConfig.json();
      res.send({ message: "success" });
    } catch (error) {
      res.send({ message: "error" });
    }
  } else {
    res.send({ message: "error" });
  }
});
//starts express app
app.listen(port, () => {
  console.log(`Tracking asteroids at port: ${port}`);
});
