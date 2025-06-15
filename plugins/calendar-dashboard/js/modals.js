import * as api from './api.js';
import * as utils from './utils.js';
import * as dom from './dom.js';

// Helper to dispatch a custom event that main.js will listen for.
function requestCalendarRefresh() {
    document.body.dispatchEvent(new CustomEvent('calendar-needs-refresh'));
}

export function closeModal(id) {
    const modalEl = dom.findElOrLog(id, 'closeModal');
    if (modalEl) modalEl.classList.add('hidden');
}

export function showEventDetails(event) {
    dom.findElOrLog('event-detail-title', 'showEventDetails').textContent = event.summary || 'No Title';
    dom.findElOrLog('event-detail-time', 'showEventDetails').textContent = utils.formatTime(event.start.dateTime) ? `${utils.formatTime(event.start.dateTime)} on ${utils.formatDate(event.start.dateTime)}` : `All Day on ${utils.formatDate(event.start.date)}`;
    
    const desc = dom.findElOrLog('event-detail-description', 'showEventDetails');
    if (desc) {
        const fullDesc = event.description ? event.description.replace(/(<a href=")(?!https?:\/\/)/g, '$1https://') : 'No description provided.';
        desc.innerHTML = fullDesc.length>300 ? `${fullDesc.substring(0,300)}... <a href="#" class="text-blue-400 hover:underline">show more</a>` : fullDesc;
        if(fullDesc.length>300)desc.querySelector('a').onclick = (e)=>{e.preventDefault();desc.innerHTML=fullDesc;};
    }
    
    const attendeesEl = dom.findElOrLog('event-detail-attendees', 'showEventDetails');
    if (attendeesEl) {
        attendeesEl.innerHTML = event.attendees?.map(att=>{const i={accepted:'✔️',declined:'❌',tentative:'❓',needsAction:'⚪'};return `<li class="flex items-center space-x-2"><span>${i[att.responseStatus]||'⚪'}</span><span class="text-gray-300">${att.email}</span></li>`}).join('')||'<li>No attendee info.</li>';
    }
    
    dom.findElOrLog('event-detail-gcal-link', 'showEventDetails').href = event.htmlLink;
    const self=event.attendees?.find(a=>a.self);
    const canAccept=self&&self.responseStatus!=='accepted';
    const acceptBtn=dom.findElOrLog('event-detail-accept-btn', 'showEventDetails');
    acceptBtn.classList.toggle('hidden',!canAccept);
    if(canAccept)acceptBtn.onclick=async()=>{
        try {
            await api.acceptMeeting({eventId:event.id,calendarId:event.organizer.email,attendeeEmail:self.email});
            window.electronAPI.ui.showToast({ type: 'success', message: 'Meeting accepted!' });
            closeModal('details-modal');
            requestCalendarRefresh(); // Dispatch event instead of calling directly
        } catch(err) {
            window.electronAPI.ui.showToast({ type: 'error', message: 'Failed to accept meeting: ' + err.message });
        }
    };
    
    dom.findElOrLog('details-modal', 'showEventDetails').classList.remove('hidden');
}

export async function openCalendarsModal() {
    const allCals = await api.getCalendarList();
    const settings = await api.getPluginSettings();
    const synced=new Set(settings.syncedCalendars?JSON.parse(settings.syncedCalendars):[]);
    const calendarsList = dom.findElOrLog('calendars-list', 'openCalendarsModal');
    calendarsList.innerHTML = '';
    allCals.forEach(cal=>{
        const item = document.createElement('label');
        item.className='flex items-center space-x-3 text-white cursor-pointer p-2 hover:bg-gray-700 rounded-md';
        item.innerHTML = `<input type="color" value="${cal.color||'#667EEA'}"><input type="checkbox" data-id="${cal.id}" class="form-checkbox h-5 w-5" ${synced.has(cal.id)?'checked':''}><span class="flex-1">${cal.summary}</span>`;
        // Dispatch event instead of calling directly
        item.querySelector('input[type=color]').addEventListener('change',async e=>{await api.updateCalendarColor({calendarId:cal.id,color:e.target.value});requestCalendarRefresh();});
        item.querySelector('input[type=checkbox]').addEventListener('change',async e=>{e.target.checked?synced.add(cal.id):synced.delete(cal.id);await api.setPluginSetting('syncedCalendars',JSON.stringify(Array.from(synced)));requestCalendarRefresh();});
        calendarsList.appendChild(item);
    });
    dom.findElOrLog('calendars-modal', 'openCalendarsModal').classList.remove('hidden');
}

export function showConfirmationModal(title, message, onConfirm) {
    dom.findElOrLog('confirmation-title', 'showConfirmationModal').textContent = title;
    dom.findElOrLog('confirmation-message', 'showConfirmationModal').textContent = message;
    
    const confirmBtn = dom.findElOrLog('confirm-action-btn', 'showConfirmationModal');
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    newConfirmBtn.addEventListener('click', () => {
        onConfirm();
        closeModal('confirmation-modal');
    });
    
    dom.findElOrLog('confirmation-modal', 'showConfirmationModal').classList.remove('hidden');
}