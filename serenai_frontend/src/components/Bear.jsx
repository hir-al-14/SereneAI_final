// src/components/Bear.jsx
import React from 'react';
import Lottie from 'lottie-react';
import bearAnimation from '../assets/bear.json'; // Make sure bear.json is in assets

const Bear = () => {
  return (
    <div style={{ width: 200, margin: '0 auto' }}>
      <Lottie animationData={bearAnimation} loop={true} />
    </div>
  );
};

export default Bear;