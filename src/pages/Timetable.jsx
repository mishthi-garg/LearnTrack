import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

function Timetable(){
    const events = [
        {
            title: "ADC",
            start: "2026-06-07T09:00:00",
            end: "2026-06-07T10:30:00",
        },
        {
            title: "DSA",
            start: "2026-06-08T11:00:00",
            end: "2026-06-08T12:30:00",
        },
        {
            title: "OS",
            start: "2026-06-09T09:00:00",
            end: "2026-06-09T10:30:00",
        },
        {
            title: "DBMS",
            start: "2026-06-09T11:00:00",
            end: "2026-06-09T12:30:00",
        },
    ];
    
    

    return(
        <div>
            <h1 className="text-2xl font-bold text-blue-600">Timetable</h1>
            <div className="m-2 p-4 rounded-lg shadow border border-gray-200">
                <FullCalendar
                    plugins={[timeGridPlugin, interactionPlugin]}
                    initialView="timeGridWeek"
                    events = {events}
                    height="auto"
                />
            </div>
        </div>
    )
}

export default Timetable;