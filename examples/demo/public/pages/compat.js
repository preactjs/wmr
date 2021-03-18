import { useState } from 'preact/hooks';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

export default function CompatDemo() {
	const [value, onChange] = useState(new Date());
	return <Calendar onChange={onChange} showWeekNumbers value={value} />;
}
