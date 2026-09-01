import { useState, useEffect } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap
} from 'react-leaflet'

import 'leaflet/dist/leaflet.css'
import './App.css'


// =====================================
// MAP AUTO FIT FUNCTION
// =====================================

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


// =====================================
// MAIN APP
// =====================================

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
  // GET LOCATION COORDINATES
  // =====================================

  const getCoordinates = async (location) => {

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(location + ', India')}`
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
  // GET ROUTES FROM OSRM
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

      coordinates: route.geometry.coordinates

    }))
  }


  // =====================================
  // WEATHER RISK CALCULATION
  // =====================================

  const calculateWeatherRisk = (
    sourceData,
    destinationData
  ) => {

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
  // ANALYZE ROUTE
  // =====================================

  const analyzeRoute = async () => {

    if (!source.trim() || !destination.trim()) {

      alert('Please enter both Source and Destination')

      return
    }


    setLoading(true)

    setRoutes([])

    setResult('')

    setSourceWeather(null)

    setDestinationWeather(null)


    try {

      // GET LOCATIONS

      const sourceCoords =
        await getCoordinates(source)


      const destinationCoords =
        await getCoordinates(destination)


      if (!sourceCoords || !destinationCoords) {

        alert(
          'Location not found. Please enter valid city names.'
        )

        setLoading(false)

        return
      }


      setSourcePosition(sourceCoords)

      setDestinationPosition(destinationCoords)


      // GET WEATHER

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


      // CALCULATE RISK

      const risk =
        calculateWeatherRisk(
          sourceWeatherData,
          destinationWeatherData
        )


      setWeatherRisk(risk)


      // GET ROUTES

      const realRoutes =
        await getRoutes(
          sourceCoords,
          destinationCoords
        )


      if (realRoutes.length === 0) {

        alert('No road route found.')

        setLoading(false)

        return
      }


      setRoutes(realRoutes)


      // RISK LEVEL

      let riskLevel = ''

      if (risk >= 70) {

        riskLevel = 'High Weather Risk 🔴'

      } else if (risk >= 40) {

        riskLevel = 'Medium Weather Risk 🟠'

      } else {

        riskLevel = 'Low Weather Risk 🟢'

      }


      setResult(
        `Journey analysis completed successfully from ${source} to ${destination}. ${riskLevel}`
      )

    }

    catch (error) {

      console.error(error)

      alert(
        'Unable to analyze the route. Please check your internet connection.'
      )

    }

    finally {

      setLoading(false)

    }

  }


  // =====================================
  // ROUTE COLORS
  // =====================================

  const routeColors = [
    '#2563eb',
    '#16a34a',
    '#dc2626',
    '#9333ea'
  ]


  // =====================================
  // RISK CLASS
  // =====================================

  const getRiskClass = () => {

    if (weatherRisk >= 70) return 'high-risk'

    if (weatherRisk >= 40) return 'medium-risk'

    return 'low-risk'
  }


  return (

    <div className="app">


      {/* ================= HEADER ================= */}

      <header className="header">

        <div className="logo">

          <span className="logo-icon">🛰️</span>

          <div>

            <h1>NER-SMART</h1>

            <p>
              North Eastern Region Smart Logistics & Route Risk Management
            </p>

          </div>

        </div>


        <div className="header-badge">
          🇮🇳 Northeast India
        </div>

      </header>



      <main className="main">


        {/* ================= HERO ================= */}

        <section className="hero-section">

          <div className="hero-badge">

            🛰️ Smart Transportation System

          </div>


          <h2>

            Smart Routes for a
            <span> Safer Journey</span>

          </h2>


          <p>

            Analyze road routes, compare alternatives and evaluate
            weather-related travel risks across the North Eastern Region.

          </p>


          <button
            className="analyze-btn hero-btn"
            onClick={() => setShowForm(!showForm)}
          >

            🗺️ {showForm ? 'Close Analysis' : 'Analyze Routes'}

          </button>

        </section>



        {/* ================= STATS ================= */}

        <section className="stats">

          <div className="stat-card">

            <span>🌦️</span>

            <div>

              <h3>Live Weather</h3>

              <p>Real-time weather conditions</p>

            </div>

          </div>


          <div className="stat-card">

            <span>🛣️</span>

            <div>

              <h3>Route Analysis</h3>

              <p>Compare available routes</p>

            </div>

          </div>


          <div className="stat-card">

            <span>⚠️</span>

            <div>

              <h3>Risk Detection</h3>

              <p>Weather-based risk score</p>

            </div>

          </div>

        </section>



        {/* ================= FORM ================= */}

        {showForm && (

          <section className="route-form">

            <div className="section-heading">

              <div className="section-icon">
                🗺️
              </div>

              <div>

                <h2>Route Analysis</h2>

                <p>
                  Enter your journey details below
                </p>

              </div>

            </div>



            <div className="input-grid">


              {/* SOURCE */}

              <div className="input-group">

                <label>
                  📍 Source Location
                </label>

                <input
                  type="text"
                  placeholder="Example: Guwahati"
                  value={source}
                  onChange={(e) =>
                    setSource(e.target.value)
                  }
                />

              </div>



              {/* DESTINATION */}

              <div className="input-group">

                <label>
                  🎯 Destination
                </label>

                <input
                  type="text"
                  placeholder="Example: Itanagar"
                  value={destination}
                  onChange={(e) =>
                    setDestination(e.target.value)
                  }
                />

              </div>


            </div>



            <button
              className="analyze-btn main-analyze-btn"
              onClick={analyzeRoute}
              disabled={loading}
            >

              {loading
                ? '⏳ Analyzing Journey...'
                : '🚀 Analyze Journey'
              }

            </button>



            {/* ================= WEATHER ================= */}

            {sourceWeather && destinationWeather && (

              <section className="analysis-card weather-card">

                <div className="card-title">

                  <h2>🌦️ Live Weather Analysis</h2>

                  <span className="live-badge">
                    ● LIVE
                  </span>

                </div>


                <div className="weather-grid">


                  <div className="weather-box">

                    <h3>📍 {source}</h3>

                    <div className="weather-details">

                      <span>
                        🌡️ {sourceWeather.temperature}°C
                      </span>

                      <span>
                        🌧️ {sourceWeather.rain} mm
                      </span>

                    </div>

                  </div>



                  <div className="weather-box">

                    <h3>🎯 {destination}</h3>

                    <div className="weather-details">

                      <span>
                        🌡️ {destinationWeather.temperature}°C
                      </span>

                      <span>
                        🌧️ {destinationWeather.rain} mm
                      </span>

                    </div>

                  </div>


                </div>

              </section>

            )}



            {/* ================= RISK ================= */}

            {result && (

              <section
                className={`analysis-card risk-card ${getRiskClass()}`}
              >

                <h2>
                  🤖 AI Weather Risk Analysis
                </h2>


                <p className="analysis-text">

                  {result}

                </p>


                <div className="risk-score">

                  <div>

                    <span className="risk-label">
                      Weather Risk Score
                    </span>

                    <strong>
                      {weatherRisk}/100
                    </strong>

                  </div>


                  <div className="risk-bar">

                    <div
                      className="risk-progress"
                      style={{
                        width: `${weatherRisk}%`
                      }}
                    />

                  </div>

                </div>

              </section>

            )}



            {/* ================= ROUTES ================= */}

            {routes.length > 0 && (

              <section className="analysis-card routes-card">

                <div className="card-title">

                  <div>

                    <h2>🛣️ Available Routes</h2>

                    <p>
                      Compare routes before selecting your journey.
                    </p>

                  </div>

                </div>


                <div className="routes-grid">

                  {routes.map((route, index) => (

                    <div
                      className="route-item"
                      key={route.id}
                    >

                      <div className="route-number">

                        {index + 1}

                      </div>


                      <div className="route-info">

                        <h3>

                          {index === 0 &&
                            '🔵 Direct Route'}

                          {index === 1 &&
                            '🟢 Alternative Route 1'}

                          {index === 2 &&
                            '🔴 Alternative Route 2'}

                          {index > 2 &&
                            `🛣️ Route ${index + 1}`}

                        </h3>


                        <div className="route-data">

                          <span>
                            📏 {route.distance} km
                          </span>

                          <span>
                            ⏱️ {route.duration} hrs
                          </span>

                        </div>

                      </div>

                    </div>

                  ))}

                </div>

              </section>

            )}



            {/* ================= MAP ================= */}

            {routes.length > 0 &&
              sourcePosition &&
              destinationPosition && (

              <section className="map-section">

                <div className="map-heading">

                  <div>

                    <h2>
                      🗺️ Route Visualization
                    </h2>

                    <p>
                      Visual comparison of available routes
                    </p>

                  </div>

                </div>


                {/* LEGEND */}

                <div className="route-legend">

                  <span>
                    🔵 Direct Route
                  </span>

                  <span>
                    🟢 Alternative Route
                  </span>

                  <span>
                    🔴 Other Route
                  </span>

                </div>



                <MapContainer
                  center={sourcePosition}
                  zoom={7}
                  className="route-map"
                >

                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="&copy; OpenStreetMap contributors"
                  />


                  <Marker position={sourcePosition}>

                    <Popup>

                      📍 <strong>Source:</strong> {source}

                    </Popup>

                  </Marker>



                  <Marker position={destinationPosition}>

                    <Popup>

                      🎯 <strong>Destination:</strong> {destination}

                    </Popup>

                  </Marker>



                  {/* ROUTES */}

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
                          routeColors[
                            index % routeColors.length
                          ],

                        weight: 6,

                        opacity: 0.85

                      }}

                    />

                  ))}


                  <FitMapToRoutes
                    routes={routes}
                  />

                </MapContainer>

              </section>

            )}

          </section>

        )}



        {/* ================= FEATURES ================= */}

        <section className="features">

          <h2>
            Why NER-SMART?
          </h2>


          <div className="features-grid">


            <div className="feature-card">

              <div className="feature-icon">
                🌦️
              </div>

              <h3>
                Live Weather
              </h3>

              <p>
                Monitor current weather conditions for safer travel decisions.
              </p>

            </div>



            <div className="feature-card">

              <div className="feature-icon">
                🛣️
              </div>

              <h3>
                Multiple Routes
              </h3>

              <p>
                Compare available road routes between locations.
              </p>

            </div>



            <div className="feature-card">

              <div className="feature-icon">
                ⚖️
              </div>

              <h3>
                Smart Risk Score
              </h3>

              <p>
                Evaluate weather-related travel risks before your journey.
              </p>

            </div>


          </div>

        </section>


      </main>



      {/* ================= FOOTER ================= */}

      <footer className="footer">

        <h3>
          NER-SMART
        </h3>

        <p>
          Smart Logistics & Route Risk Management for Northeast India 🇮🇳
        </p>

      </footer>


    </div>

  )
}


export default App