import { useState, useEffect } from 'react';

const useTime = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  const hours = currentTime.getHours();
  const minutes = currentTime.getMinutes();

  return {
    time: {
      hours: hours,
      minutes: minutes,
      hours12: hours % 12 === 0 ? 12 : hours % 12,
      ampm: hours >= 12 ? 'PM' : 'AM',
    },
    date: currentTime.toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
    day: currentTime.toLocaleDateString(undefined, { weekday: 'long' }),
  };
};

export default useTime;