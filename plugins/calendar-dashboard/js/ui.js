import * as api from './api.js';
import * as utils from './utils.js';

// This helper will be used by all functions to get elements just-in-time
// and log a specific error if an element is not found.
const findElOrLog = (id, functionName) => {
    const el = document.getElementById(id);
    if (!el) {
        // This log will tell us exactly where the failure is.
        console.error(`UI ERROR: Element with ID '${id}' was not found in the DOM when called by function '${functionName}'.`);
    }
    return el;
};

export function switchView(viewId) {
    ['auth-view', 'main-view', 'message-view'].forEach(id => {
        const el = findElOrLog(id, 'switchView');
        if (el) el.classList.toggle('hidden', id !== viewId);
    });
}

export function showMessage(text, isError = false) {
    switchView('message-view');
    const messageEl = findElOrLog('message-text', 'showMessage');
    if (messageEl) {
        messageEl.innerHTML = isError ? `<span class="text-red-400 font-bold">Error:</span> <pre class="text-sm text-red-400 whitespace-pre-wrap">${text}</pre>` : text;
    }
}

export function closeModal(id) {
    const modalEl = findElOrLog(id, 'closeModal');
    if (modalEl) modalEl.classList.add('hidden');
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

export async function fetchAndRenderEvents() {
    try {
        const messageEl = findElOrLog('message-text', 'fetchAndRenderEvents');
        if(!messageEl) throw new Error("message-text element not found.");
        switchView('message-view');
        messageEl.textContent = "Fetching calendar events...";

        const { upcomingEvents, displayDateKeys } = await api.getEvents();
        const now = new Date();
        const nextMeeting = upcomingEvents.find(event => event.start.dateTime && new Date(event.start.dateTime).getTime() >= now.getTime());

        const nextMeetingDetails = findElOrLog('next-meeting-details', 'fetchAndRenderEvents');
        const joinNextMeetingBtn = findElOrLog('join-next-meeting-btn', 'fetchAndRenderEvents');
        const videoContainer = findElOrLog('video-container', 'fetchAndRenderEvents');
        if (!nextMeetingDetails || !joinNextMeetingBtn || !videoContainer) throw new Error("Main view elements are missing.");

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
        
        const eventsByDay = upcomingEvents.reduce((acc,event) => {
            const key = (event.start.dateTime||event.start.date).split('T')[0];
            if(!acc[key])acc[key]={allDay:[],timed:[]};
            !event.start.dateTime ? acc[key].allDay.push(event) : acc[key].timed.push(event);
            return acc;
        },{});

        const agendaGrid = findElOrLog('agenda-grid', 'fetchAndRenderEvents');
        if (!agendaGrid) throw new Error("agenda-grid element not found.");

        agendaGrid.innerHTML = displayDateKeys.map(key => {
            const dayEvs = eventsByDay[key]||{allDay:[],timed:[]};
            const d = new Date(key+'T12:00:00');
            const collapsed = localStorage.getItem(`allDayCollapsed_${key}`)==='true';
            const allDayHTML = dayEvs.allDay.length > 0 ? `<div id="all-day-section-${key}"><div class="collapsible-header" data-target="all-day-content-${key}"><h4 class="text-md font-semibold text-indigo-300">All Day</h4><svg class="w-5 h-5 collapsible-arrow ${collapsed?'collapsed':''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg></div><div id="all-day-content-${key}" class="collapsible-content ${collapsed?'hidden':''}">${dayEvs.allDay.map(e => renderEvent(e).outerHTML).join('')}</div></div>` : '';
            const timedHTML = dayEvs.timed.length > 0 ? `<div class="mt-2"><h4 class="text-md font-semibold text-indigo-300 mb-2">Meetings</h4>${dayEvs.timed.map(e => renderEvent(e).outerHTML).join('')}</div>` : '';
            return `<div class="day-card card p-4 space-y-2 flex flex-col"><h3 class="text-lg font-bold text-white border-b border-gray-700 pb-2 mb-2">${d.toLocaleDateString(undefined,{weekday:'long'})}, ${d.toLocaleDateString(undefined,{month:'long',day:'numeric'})}</h3>${allDayHTML||timedHTML?allDayHTML+timedHTML:'<p class="text-gray-400 text-sm">No events scheduled.</p>'}</div>`;
        }).join('');
    
        document.querySelectorAll('.collapsible-header').forEach(h=>{h.addEventListener('click',()=>{const c=document.getElementById(h.dataset.target);c.classList.toggle('hidden');h.querySelector('.collapsible-arrow').classList.toggle('collapsed');localStorage.setItem(`allDayCollapsed_${h.dataset.target.replace('all-day-content-','')}`,c.classList.contains('hidden'))})});
        
        switchView('main-view');
    } catch (e) { 
        showMessage(`Could not load events: ${e.message||e}`, true); 
    }
}

export function showEventDetails(event) {
    findElOrLog('event-detail-title', 'showEventDetails').textContent = event.summary || 'No Title';
    findElOrLog('event-detail-time', 'showEventDetails').textContent = utils.formatTime(event.start.dateTime) ? `${utils.formatTime(event.start.dateTime)} on ${utils.formatDate(event.start.dateTime)}` : `All Day on ${utils.formatDate(event.start.date)}`;
    
    const desc = findElOrLog('event-detail-description', 'showEventDetails');
    const fullDesc = event.description ? event.description.replace(/(<a href=")(?!https?:\/\/)/g, '$1https://') : 'No description provided.';
    if(desc) {
        desc.innerHTML = fullDesc.length>300 ? `${fullDesc.substring(0,300)}... <a href="#" class="text-blue-400 hover:underline">show more</a>` : fullDesc;
        if(fullDesc.length>300)desc.querySelector('a').onclick = (e)=>{e.preventDefault();desc.innerHTML=fullDesc;};
    }
    
    const attendeesEl = findElOrLog('event-detail-attendees', 'showEventDetails');
    if (attendeesEl) {
        attendeesEl.innerHTML = event.attendees?.map(att=>{const i={accepted:'✔️',declined:'❌',tentative:'❓',needsAction:'⚪'};return `<li class="flex items-center space-x-2"><span>${i[att.responseStatus]||'⚪'}</span><span class="text-gray-300">${att.email}</span></li>`}).join('')||'<li>No attendee info.</li>';
    }
    
    findElOrLog('event-detail-gcal-link', 'showEventDetails').href = event.htmlLink;
    const self=event.attendees?.find(a=>a.self);
    const canAccept=self&&self.responseStatus!=='accepted';
    const acceptBtn=findElOrLog('event-detail-accept-btn', 'showEventDetails');
    acceptBtn.classList.toggle('hidden',!canAccept);
    if(canAccept)acceptBtn.onclick=async()=>{
        try {
            await api.acceptMeeting({eventId:event.id,calendarId:event.organizer.email,attendeeEmail:self.email});
            window.electronAPI.ui.showToast({ type: 'success', message: 'Meeting accepted!' });
            closeModal('details-modal');
            fetchAndRenderEvents();
        } catch(err) {
            window.electronAPI.ui.showToast({ type: 'error', message: 'Failed to accept meeting: ' + err.message });
        }
    };
    
    findElOrLog('details-modal', 'showEventDetails').classList.remove('hidden');
}

export async function openCalendarsModal() {
    const allCals = await api.getCalendarList();
    const settings = await api.getPluginSettings();
    const synced=new Set(settings.syncedCalendars?JSON.parse(settings.syncedCalendars):[]);
    const calendarsList = findElOrLog('calendars-list', 'openCalendarsModal');
    calendarsList.innerHTML = '';
    allCals.forEach(cal=>{
        const item = document.createElement('label');
        item.className='flex items-center space-x-3 text-white cursor-pointer p-2 hover:bg-gray-700 rounded-md';
        item.innerHTML = `<input type="color" value="${cal.color||'#667EEA'}"><input type="checkbox" data-id="${cal.id}" class="form-checkbox h-5 w-5" ${synced.has(cal.id)?'checked':''}><span class="flex-1">${cal.summary}</span>`;
        item.querySelector('input[type=color]').addEventListener('change',async e=>{await api.updateCalendarColor({calendarId:cal.id,color:e.target.value});fetchAndRenderEvents();});
        item.querySelector('input[type=checkbox]').addEventListener('change',async e=>{e.target.checked?synced.add(cal.id):synced.delete(cal.id);await api.setPluginSetting('syncedCalendars',JSON.stringify(Array.from(synced)));fetchAndRenderEvents();});
        calendarsList.appendChild(item);
    });
    findElOrLog('calendars-modal', 'openCalendarsModal').classList.remove('hidden');
}

export function showConfirmationModal(title, message, onConfirm) {
    findElOrLog('confirmation-title', 'showConfirmationModal').textContent = title;
    findElOrLog('confirmation-message', 'showConfirmationModal').textContent = message;
    
    const confirmBtn = findElOrLog('confirm-action-btn', 'showConfirmationModal');
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    newConfirmBtn.addEventListener('click', () => {
        onConfirm();
        closeModal('confirmation-modal');
    });
    
    findElOrLog('confirmation-modal', 'showConfirmationModal').classList.remove('hidden');
}