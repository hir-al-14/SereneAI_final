import React from 'react';
import Lottie from 'lottie-react';
import bearAnimation from '../assets/bear.json'; // replace with your animation

const SoothingAnimation = () => {
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, width: 250 }}>
      <Lottie animationData={bearAnimation} loop={true} />
    </div>
  );
};

export default SoothingAnimation;
