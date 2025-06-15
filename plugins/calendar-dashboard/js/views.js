import * as api from './api.js';
import * as utils from './utils.js';
import * as dom from './dom.js';
import { showEventDetails } from './modals.js';

/**
 * This is the main function for loading and displaying the entire calendar view.
 */
export async function loadCalendar() {
    // dom.showMessage("Loading Calendar..."); // Temporarily disabled for debugging.
    try {
        // Step 1: Fetch all necessary data from the backend first.
        const calendarData = await api.getEvents();
        
        // Step 2: Switch to the main content view, making its elements available.
        dom.switchView('main-view');

        // Step 3: Defer rendering to the next event loop cycle to ensure DOM is ready.
        setTimeout(() => {
            renderCalendarView(calendarData);
        }, 0);

    } catch (error) {
        dom.showMessage(`Could not load events: ${error.message}`, true);
    }
}

/**
 * This function ONLY renders the UI. It takes data as a parameter and assumes
 * the correct view is already visible.
 * @param {object} calendarData - The event data fetched from the backend.
 */
function renderCalendarView(calendarData) {
    console.log("Rendering calendar view with data...");
    const { upcomingEvents, displayDateKeys } = calendarData;
    
    // --- Find all necessary elements ---
    const nextMeetingDetails = dom.findElOrLog('next-meeting-details', 'renderCalendarView');
    const joinNextMeetingBtn = dom.findElOrLog('join-next-meeting-btn', 'renderCalendarView');
    const videoContainer = dom.findElOrLog('video-container', 'renderCalendarView');
    const agendaGrid = dom.findElOrLog('agenda-grid', 'renderCalendarView');
    
    if (!nextMeetingDetails || !joinNextMeetingBtn || !videoContainer || !agendaGrid) {
        throw new Error("One or more critical view elements are missing from the DOM during render.");
    }

    // --- Render Next Upcoming Meeting ---
    const now = new Date();
    const nextMeeting = upcomingEvents.find(event => event.start.dateTime && new Date(event.start.dateTime).getTime() >= now.getTime());

    if (nextMeeting && nextMeeting.start.dateTime.startsWith(now.toISOString().split('T')[0])) {
        nextMeetingDetails.innerHTML = `<h4 class="text-xl font-bold text-white mb-1 truncate">${nextMeeting.summary||'No Title'}</h4><p class="text-indigo-300 text-sm">${utils.formatTime(nextMeeting.start.dateTime)} on ${utils.formatDate(nextMeeting.start.dateTime)}</p>`;
        const link = utils.getMeetingLink(nextMeeting);
        joinNextMeetingBtn.classList.toggle('hidden', !link);
        if (link) joinNextMeetingBtn.onclick = () => window.electronAPI.openExternalLink(link);
        videoContainer.classList.add('hidden');
    } else {
        nextMeetingDetails.innerHTML = `<p class="text-gray-400 text-center">Hurray! No more meetings today!</p>`;
        joinNextMeetingBtn.classList.add('hidden');
        videoContainer.classList.remove('hidden');
    }
    
    // --- Render Agenda Grid ---
    const eventsByDay = upcomingEvents.reduce((acc,event) => {
        const key = (event.start.dateTime||event.start.date).split('T')[0];
        if(!acc[key])acc[key]={allDay:[],timed:[]};
        !event.start.dateTime ? acc[key].allDay.push(event) : acc[key].timed.push(event);
        return acc;
    },{});

    agendaGrid.innerHTML = displayDateKeys.map(key => {
        const dayEvs = eventsByDay[key]||{allDay:[],timed:[]};
        const d = new Date(key+'T12:00:00');
        const collapsed = localStorage.getItem(`allDayCollapsed_${key}`)==='true';
        const allDayHTML = dayEvs.allDay.length > 0 ? `<div id="all-day-section-${key}"><div class="collapsible-header" data-target="all-day-content-${key}"><h4 class="text-md font-semibold text-indigo-300">All Day</h4><svg class="w-5 h-5 collapsible-arrow ${collapsed?'collapsed':''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg></div><div id="all-day-content-${key}" class="collapsible-content ${collapsed?'hidden':''}">${dayEvs.allDay.map(e => renderEvent(e).outerHTML).join('')}</div></div>` : '';
        const timedHTML = dayEvs.timed.length > 0 ? `<div class="mt-2"><h4 class="text-md font-semibold text-indigo-300 mb-2">Meetings</h4>${dayEvs.timed.map(e => renderEvent(e).outerHTML).join('')}</div>` : '';
        return `<div class="day-card card p-4 space-y-2 flex flex-col"><h3 class="text-lg font-bold text-white border-b border-gray-700 pb-2 mb-2">${d.toLocaleDateString(undefined,{weekday:'long'})}, ${d.toLocaleDateString(undefined,{month:'long',day:'numeric'})}</h3>${allDayHTML||timedHTML?allDayHTML+timedHTML:'<p class="text-gray-400 text-sm">No events scheduled.</p>'}</div>`;
    }).join('');

    document.querySelectorAll('.collapsible-header').forEach(h=>{h.addEventListener('click',()=>{const c=document.getElementById(h.dataset.target);c.classList.toggle('hidden');h.querySelector('.collapsible-arrow').classList.toggle('collapsed');localStorage.setItem(`allDayCollapsed_${h.dataset.target.replace('all-day-content-','')}`,c.classList.contains('hidden'))})});
}

function renderEvent(event) {
    const selfAttendee = event.attendees?.find(a => a.self);
    const isAccepted = !selfAttendee || selfAttendee.responseStatus === 'accepted' || selfAttendee.responseStatus === 'tentative';
    const color = event.calendarColor || '#6B7280';
    const gradient = `linear-gradient(90deg, ${color}2E 0%, transparent 80%)`;
    const opacity = isAccepted ? '1' : '0.6';

    const card = document.createElement('div');
    card.className = 'event-card card p-3 mb-2 flex flex-col';
    card.style.cssText = `border-left-color: ${color}; background: ${gradient}; opacity: ${opacity};`;
    card.onclick = () => showEventDetails(event);
    card.innerHTML = `
        <h4 class="font-bold text-md truncate" title="${event.summary || 'No Title'}">${event.summary || 'No Title'}</h4>
        ${!event.start.dateTime ? '' : `<p class="text-sm text-gray-300">${utils.formatTime(event.start.dateTime)}</p>`}
        <p class="text-xs text-gray-400 mt-1 truncate">${event.location || ''}</p>
    `;
    return card;
}