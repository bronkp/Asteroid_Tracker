const express = require('express')
const app = express()
app.use(express.static(__dirname + '/public'));
var path = require('path')
const port = 3000
app.get('/raw', async (req, res) => {
    const today = new Date()
    const start = `${today.getFullYear()}-${today.getMonth()+1}-${today.getDate()}` 
    const sevenFuture= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)  
    const end = `${sevenFuture.getFullYear()}-${sevenFuture.getMonth()+1}-${sevenFuture.getDate()}`
   const response =await fetch(`https://api.nasa.gov/neo/rest/v1/feed?start_date=${start}&end_date=${end}&api_key=p4xlHJXtDg4lFfq5dU85dwpJ4vGkp2bnvXDNO6c8`).then(data=>{return data.json()})
  console.log(`https://api.nasa.gov/neo/rest/v1/feed?start_date=${start}&end_date=${end}&api_key=p4xlHJXtDg4lFfq5dU85dwpJ4vGkp2bnvXDNO6c8`)
 if(response.near_earth_objects){

   const dates = Object.keys(response.near_earth_objects) 
   const objects = []
   dates.map(date=>{
     response.near_earth_objects[date].map(object=>{
       objects.push({name:object.name, diameter: object.estimated_diameter.feet, isHazard: object.is_potentially_hazardous_asteroid,distance:object.close_approach_data[0].miss_distance.miles, speed: object.close_approach_data[0].relative_velocity.miles_per_hour})
      })
    })
    res.send({objects:objects})
  }
})
app.get('/', async (req, res) => {
  
    res.sendFile('/public/home/home.html')
  })


app.listen(port, () => {
  console.log(`Tracking asteroids at port: ${port}`)
})