import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

document.querySelector('h1').textContent = typeof Calendar === 'function' ? 'it works' : "it doesn't work";
