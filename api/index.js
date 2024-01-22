const express = require("express");
require('dotenv').config()
let dotenv = require('dotenv').config()
const app = express();
app.use(express.static(__dirname + "/public"));
var path = require("path");
const port = 3000;
app.get("/raw", async (req, res) => {
  const readSingle = await fetch(
    `https://edge-config.vercel.com/${process.env.EDGE_ID}/item/asteroids?token=${process.env.EDGE_TOKEN}`,
  );
  const result = await readSingle.json();
 
    res.send(JSON.parse(result));
  
  })

app.get("/", async (req, res) => {
  res.sendFile("/home/home.html", { root: path.join(__dirname, "public") });
});
app.get("/about", async (req, res) => {
  res.sendFile("/about/about.html", { root: path.join(__dirname, "public") });
});

app.get("/cron", async (req, res) => {
  //checks cron key
  const authHeader = req.headers;
  res.send({yo:authHeader})
  if(authHeader===`Bearer ${process.env.CRON_SECRET}`){
    //gets asteroids
    //gets current week span
    const today = new Date();
    const start = `${today.getFullYear()}-${
      today.getMonth() + 1
    }-${today.getDate()}`;
    const sevenFuture = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const end = `${sevenFuture.getFullYear()}-${
      sevenFuture.getMonth() + 1
    }-${sevenFuture.getDate()}`;
    const response = await fetch(
      `https://api.nasa.gov/neo/rest/v1/feed?start_date=${start}&end_date=${end}&api_key=${process.env.NASA_KEY}`
    ).then((data) => {
      return data.json();
    });
    let cronResult = ''
    if (response.near_earth_objects) {
      const dates = Object.keys(response.near_earth_objects);
      const objects = [];
      dates.map((date) => {
        response.near_earth_objects[date].map((object) => {
          objects.push({
            name: object.name,
            diameter: object.estimated_diameter.feet,
            isHazard: object.is_potentially_hazardous_asteroid,
            distance: object.close_approach_data[0].miss_distance.miles,
            speed: object.close_approach_data[0].relative_velocity.miles_per_hour,
          });
        });
      });
    // gets record asteroids
      let count = 0;
      let biggest = { diameter: { estimated_diameter_max: 0 } };
      let closest = { distance: objects[0].distance };
      let fastest = { speed: 0 };
      objects.map((object) => {
        if (object.isHazard == true) {
          count++;
        }
        if (
          parseInt(object.diameter.estimated_diameter_max) >
          parseInt(biggest.diameter.estimated_diameter_max)
        ) {
          Object.assign(biggest, object);
        }
        if (parseInt(object.speed) > parseInt(fastest.speed)) {
          Object.assign(fastest, object);
        }
        if (parseInt(object.distance) < parseInt(closest.distance)) {
          Object.assign(closest, object);
        }
      });
cronResult = {updated:today,biggest:biggest,fastest:fastest,closest:closest,total_objects:objects.length,hazardous:count}
}

  try {


//sets current asteroid records every day
    const updateEdgeConfig = await fetch(
      `https://api.vercel.com/v1/edge-config/${process.env.EDGE_ID}/items`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${process.env.VERCEL_API}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [
            {
              operation: 'update',
              key: 'asteroids',
              value: JSON.stringify(cronResult),
            },
          
          ],
        }),
      },
    );
    const result = await updateEdgeConfig.json();
    res.send({message:'success'})
  } catch (error) {
    res.send({message:'error'})

  }}else{
    res.send({message:'error'})
  }
});
app.listen(port, () => {
  console.log(`Tracking asteroids at port: ${port}`);
});