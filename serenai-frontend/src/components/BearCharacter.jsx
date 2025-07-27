import React from "react"
import Lottie from "lottie-react"
import bearAnimation from "../assets/bear.json" // Lottie file path

const BearCharacter = () => {
  return (
    <div style={{ width: "200px", height: "200px", margin: "auto" }}>
      <Lottie animationData={bearAnimation} loop autoplay />
    </div>
  )
}

export default BearCharacter
