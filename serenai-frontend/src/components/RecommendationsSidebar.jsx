import React, { useEffect, useState } from "react"
import axios from "axios"
import "./RecommendationsSidebar.css"

const RecommendationsSidebar = () => {
  const [recs, setRecs] = useState({ books: [], songs: [], movies: [] })

  useEffect(() => {
    axios.get("http://localhost:8000/recommendations")
      .then(res => setRecs(res.data))
      .catch(() => setRecs({ books: [], songs: [], movies: [] }))
  }, [])

  return (
    <div className="recs-sidebar">
      <h3>📚 Books</h3>
      <ul>{recs.books.map((b, i) => <li key={i}>{b}</li>)}</ul>

      <h3>🎶 Songs</h3>
      <ul>{recs.songs.map((s, i) => <li key={i}>{s}</li>)}</ul>

      <h3>🎬 Movies</h3>
      <ul>{recs.movies.map((m, i) => <li key={i}>{m}</li>)}</ul>
    </div>
  )
}

export default RecommendationsSidebar
