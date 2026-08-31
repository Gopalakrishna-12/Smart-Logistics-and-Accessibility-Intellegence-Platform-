import { useState, useEffect } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap
} from 'react-leaflet'

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'


// ===============================
// MAP AUTO FIT FUNCTION
// ===============================

function FitMapToRoutes({ routes }) {
  const map = useMap()

  useEffect(() => {
    if (!routes || routes.length === 0) return

    const allPoints = routes.flatMap(route =>
      route.coordinates.map(point => [
        point[1],
        point[0]
      ])
    )

    if (allPoints.length > 0) {
      map.fitBounds(allPoints, {
        padding: [50, 50]
      })
    }

  }, [routes, map])

  return null
}


// ===============================
// APP
// ===============================

function App() {

  const [showForm, setShowForm] = useState(false)

  const [source, setSource] = useState('')
  const [destination, setDestination] = useState('')

  const [sourcePosition, setSourcePosition] = useState(null)
  const [destinationPosition, setDestinationPosition] = useState(null)

  const [routes, setRoutes] = useState([])

  const [loading, setLoading] = useState(false)

  const [result, setResult] = useState('')

  const [weatherRisk, setWeatherRisk] = useState(null)

  const [sourceWeather, setSourceWeather] = useState(null)
  const [destinationWeather, setDestinationWeather] = useState(null)



  // =====================================
  // GET COORDINATES FROM LOCATION NAME
  // =====================================

  const getCoordinates = async (location) => {

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(location)}`
    )

    const data = await response.json()

    if (!data || data.length === 0) {
      return null
    }

    return [
      parseFloat(data[0].lat),
      parseFloat(data[0].lon)
    ]
  }



  // =====================================
  // GET LIVE WEATHER
  // =====================================

  const getWeather = async (lat, lon) => {

    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation,rain,weather_code`
    )

    const data = await response.json()

    return {
      temperature: data.current?.temperature_2m ?? 0,
      rain: data.current?.rain ?? 0,
      precipitation: data.current?.precipitation ?? 0,
      weatherCode: data.current?.weather_code ?? 0
    }
  }



  // =====================================
  // GET REAL ROUTES FROM OSRM API
  // =====================================

  const getRoutes = async (sourceCoords, destinationCoords) => {

    const sourceLon = sourceCoords[1]
    const sourceLat = sourceCoords[0]

    const destinationLon = destinationCoords[1]
    const destinationLat = destinationCoords[0]


    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${sourceLon},${sourceLat};` +
      `${destinationLon},${destinationLat}` +
      `?overview=full&geometries=geojson&alternatives=true&steps=true`


    const response = await fetch(url)

    const data = await response.json()


    if (!data.routes || data.routes.length === 0) {
      return []
    }


    return data.routes.map((route, index) => ({

      id: index + 1,

      distance: (route.distance / 1000).toFixed(1),

      duration: (route.duration / 3600).toFixed(1),

      // REAL ROAD ROUTE COORDINATES
      coordinates: route.geometry.coordinates

    }))
  }



  // =====================================
  // WEATHER RISK CALCULATION
  // =====================================

  const calculateWeatherRisk = (sourceData, destinationData) => {

    const maxRain = Math.max(
      sourceData.precipitation || 0,
      destinationData.precipitation || 0
    )


    let risk = 20


    if (maxRain >= 1 && maxRain < 5) {
      risk = 40
    }

    else if (maxRain >= 5 && maxRain < 15) {
      risk = 65
    }

    else if (maxRain >= 15) {
      risk = 90
    }


    return risk
  }



  // =====================================
  // ANALYZE ROUTES
  // =====================================

  const analyzeRoute = async () => {

    if (!source || !destination) {
      alert('Please enter Source and Destination')
      return
    }


    setLoading(true)

    setRoutes([])

    setResult('')

    try {


      // -----------------------------
      // GET SOURCE COORDINATES
      // -----------------------------

      const sourceCoords =
        await getCoordinates(source)


      // -----------------------------
      // GET DESTINATION COORDINATES
      // -----------------------------

      const destinationCoords =
        await getCoordinates(destination)


      if (!sourceCoords || !destinationCoords) {

        alert(
          'Location not found. Please enter valid city or place names.'
        )

        setLoading(false)

        return
      }


      setSourcePosition(sourceCoords)

      setDestinationPosition(destinationCoords)



      // -----------------------------
      // GET LIVE WEATHER
      // -----------------------------

      const sourceWeatherData =
        await getWeather(
          sourceCoords[0],
          sourceCoords[1]
        )


      const destinationWeatherData =
        await getWeather(
          destinationCoords[0],
          destinationCoords[1]
        )


      setSourceWeather(sourceWeatherData)

      setDestinationWeather(destinationWeatherData)



      // -----------------------------
      // WEATHER RISK
      // -----------------------------

      const risk =
        calculateWeatherRisk(
          sourceWeatherData,
          destinationWeatherData
        )


      setWeatherRisk(risk)



      // -----------------------------
      // GET REAL ROUTES
      // -----------------------------

      const realRoutes =
        await getRoutes(
          sourceCoords,
          destinationCoords
        )


      if (realRoutes.length === 0) {

        alert('No road route found for these locations.')

        setLoading(false)

        return
      }


      setRoutes(realRoutes)



      // -----------------------------
      // RISK LEVEL
      // -----------------------------

      let riskLevel = ''

      if (risk >= 70) {
        riskLevel = 'High Weather Risk 🔴'
      }

      else if (risk >= 40) {
        riskLevel = 'Medium Weather Risk 🟠'
      }

      else {
        riskLevel = 'Low Weather Risk 🟢'
      }



      setResult(
        `Smart analysis completed for the journey from ${source} to ${destination}. ${riskLevel}`
      )


    }

    catch (error) {

      console.error(error)

      alert(
        'Unable to load route. Please check your internet connection.'
      )

    }


    setLoading(false)
  }



  // =====================================
  // ROUTE COLORS
  // =====================================

  const routeColors = [
    '#007bff',   // Blue
    '#28a745',   // Green
    '#dc3545'    // Red
  ]



  return (

    <>

      {/* ================= HEADER ================= */}

      <header className="header">

        <h1>NER-SMART</h1>

        <p>
          North Eastern Region Smart Logistics & Route Risk Management
        </p>

      </header>



      <main className="main">


        {/* ================= HERO ================= */}

        <section className="hero-section">

          <h2>Smart. Safe. Accessible.</h2>

          <p>
            Find safer routes using live weather and route analysis.
          </p>


          <button
            className="analyze-btn"
            onClick={() => setShowForm(!showForm)}
          >
            Analyze Routes
          </button>

        </section>



        {/* ================= FORM ================= */}

        {showForm && (

          <section className="route-form">


            <h2>🗺️ Route Analysis</h2>



            {/* SOURCE */}

            <input
              type="text"
              placeholder="Enter Source (Example: Gangtok)"
              value={source}
              onChange={(e) =>
                setSource(e.target.value)
              }
            />



            {/* DESTINATION */}

            <input
              type="text"
              placeholder="Enter Destination (Example: Kohima)"
              value={destination}
              onChange={(e) =>
                setDestination(e.target.value)
              }
            />



            {/* BUTTON */}

            <button
              className="analyze-btn"
              onClick={analyzeRoute}
            >

              {loading
                ? 'Analyzing Routes...'
                : 'Analyze Routes'
              }

            </button>



            {/* ================= WEATHER ================= */}

            {sourceWeather && destinationWeather && (

              <div className="result">

                <h2>🌦️ Live Weather Analysis</h2>


                <p>

                  <strong>{source}</strong>

                  {' — 🌡️ '}

                  {sourceWeather.temperature}°C

                  {' | 🌧️ Rain: '}

                  {sourceWeather.rain} mm

                </p>


                <p>

                  <strong>{destination}</strong>

                  {' — 🌡️ '}

                  {destinationWeather.temperature}°C

                  {' | 🌧️ Rain: '}

                  {destinationWeather.rain} mm

                </p>

              </div>

            )}



            {/* ================= RISK ================= */}

            {result && (

              <div className="result">

                <h2>🤖 AI Weather Risk Analysis</h2>


                <p>
                  {result}
                </p>


                <h3>

                  ⚖️ Weather Risk Score:

                  {' '}

                  {weatherRisk}/100

                </h3>

              </div>

            )}



            {/* ================= ROUTE DETAILS ================= */}

            {routes.length > 0 && (

              <div className="result">

                <h2>🗺️ Available Routes</h2>

                <p>
                  ⭐ Compare the available routes and choose the safer option.
                </p>


                {routes.map((route, index) => (

                  <p key={route.id}>

                    <strong>

                      {index === 0 && '🔵 Direct Route'}

                      {index === 1 && '🟢 Alternative Route 1'}

                      {index === 2 && '🔴 Alternative Route 2'}

                      {index > 2 && ` Route ${index + 1}`}

                    </strong>

                    {' — '}

                    {route.distance} km

                    {' | ⏱️ '}

                    {route.duration} hours

                  </p>

                ))}

              </div>

            )}



            {/* ================= MAP ================= */}

            {routes.length > 0 &&
              sourcePosition &&
              destinationPosition && (

              <div className="map-section">


                <h2>🗺️ Recommended Route Map</h2>


                {/* LEGEND */}

                <div
                  style={{
                    display: 'flex',
                    gap: '25px',
                    justifyContent: 'center',
                    marginBottom: '15px',
                    flexWrap: 'wrap'
                  }}
                >

                  <span>🔵 Direct Route</span>

                  <span>🟢 Alternative Route 1</span>

                  <span>🔴 Alternative Route 2</span>

                </div>



                <MapContainer
                  center={sourcePosition}
                  zoom={7}

                  style={{
                    height: '550px',
                    width: '100%',
                    borderRadius: '12px'
                  }}
                >


                  {/* MAP */}

                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="&copy; OpenStreetMap contributors"
                  />



                  {/* SOURCE MARKER */}

                  <Marker position={sourcePosition}>

                    <Popup>

                      📍 Source: {source}

                    </Popup>

                  </Marker>



                  {/* DESTINATION MARKER */}

                  <Marker position={destinationPosition}>

                    <Popup>

                      🎯 Destination: {destination}

                    </Popup>

                  </Marker>



                  {/* ================= REAL ROUTES ================= */}

                  {routes.map((route, index) => (

                    <Polyline

                      key={route.id}

                      positions={
                        route.coordinates.map(point => [
                          point[1],
                          point[0]
                        ])
                      }

                      pathOptions={{
                        color:
                          routeColors[index % routeColors.length],

                        weight: 6,

                        opacity: 0.85
                      }}

                    />

                  ))}



                  {/* AUTO ZOOM */}

                  <FitMapToRoutes
                    routes={routes}
                  />


                </MapContainer>

              </div>

            )}

          </section>

        )}



        {/* ================= FEATURES ================= */}

        <section className="features">


          <div className="card">

            <h3>🌦️ Live Weather</h3>

            <p>
              Check live weather conditions for the journey.
            </p>

          </div>



          <div className="card">

            <h3>🗺️ Multiple Routes</h3>

            <p>
              Compare available road routes between locations.
            </p>

          </div>



          <div className="card">

            <h3>⚖️ Weather Risk</h3>

            <p>
              Calculate travel risk based on weather conditions.
            </p>

          </div>


        </section>


      </main>

    </>

  )
}


export default App