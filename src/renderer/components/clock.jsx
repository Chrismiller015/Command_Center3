import React from 'react';
import useTime from '../hooks/useTime.js'; // Corrected path

const Clock = () => {
  const { time, date, day } = useTime();

  // Calculate rotation angles for clock hands
  const hourAngle = (time.hours % 12) * 30 + time.minutes * 0.5;
  const minuteAngle = time.minutes * 6;

  return (
    <div className="flex flex-col items-center justify-center bg-gray-800 p-8 rounded-2xl shadow-2xl space-y-6 w-full max-w-md">
      {/* Analog Clock */}
      <div className="relative w-48 h-48 bg-gray-700 rounded-full border-4 border-gray-600 shadow-inner">
        {/* Hour Hand */}
        <div
          className="absolute h-[35%] w-1.5 bg-indigo-300 top-[15%] left-1/2 -ml-[3px] origin-bottom transition-transform"
          style={{ transform: `rotate(${hourAngle}deg)` }}
        ></div>
        {/* Minute Hand */}
        <div
          className="absolute h-[45%] w-1 bg-gray-200 top-[5%] left-1/2 -ml-0.5 origin-bottom transition-transform"
          style={{ transform: `rotate(${minuteAngle}deg)` }}
        ></div>
        {/* Center Dot */}
        <div className="absolute w-3 h-3 bg-white rounded-full top-1/2 left-1/2 -mt-1.5 -ml-1.5"></div>
      </div>

      {/* Digital Clock & Date */}
      <div className="text-center">
        <p className="text-6xl font-bold tracking-wider text-white">
          {time.hours12}:{time.minutes < 10 ? `0${time.minutes}` : time.minutes}
          <span className="text-3xl ml-2">{time.ampm}</span>
        </p>
        <p className="text-xl text-gray-400 mt-2">{day}, {date}</p>
      </div>
    </div>
  );
};

export default Clock;