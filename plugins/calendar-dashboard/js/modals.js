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
    console.log(`[Calendar Plugin] showEventDetails called for event: ${event.summary || 'No Title'}`); // ADDED LOG

    dom.findElOrLog('event-detail-title', 'showEventDetails').textContent = event.summary || 'No Title';
    dom.findElOrLog('event-detail-time', 'showEventDetails').textContent = utils.formatTime(event.start.dateTime) ? `${utils.formatTime(event.start.dateTime)} on ${utils.formatDate(event.start.dateTime)}` : `All Day on ${utils.formatDate(event.start.date)}`;
    
    const desc = dom.findElOrLog('event-detail-description', 'showEventDetails');
    if (desc) {
        // Remove existing "show more" listener to prevent duplicates
        const existingShowMoreLink = desc.querySelector('a.show-more-link');
        if (existingShowMoreLink) {
            existingShowMoreLink.removeEventListener('click', desc._showMoreHandler);
            delete desc._showMoreHandler; // Clean up stored handler
        }

        const fullDesc = event.description ? event.description.replace(/(<a href=")(?!https?:\/\/)/g, '$1https://') : 'No description provided.';
        if (fullDesc.length > 300) {
            desc.innerHTML = `${fullDesc.substring(0, 300)}... <a href="#" class="text-blue-400 hover:underline show-more-link">show more</a>`;
            desc._showMoreHandler = (e) => { // Store handler to remove later
                e.preventDefault();
                desc.innerHTML = fullDesc;
            };
            desc.querySelector('a.show-more-link').addEventListener('click', desc._showMoreHandler);
        } else {
            desc.innerHTML = fullDesc;
        }
    }
    
    const attendeesEl = dom.findElOrLog('event-detail-attendees', 'showEventDetails');
    if (attendeesEl) {
        if (event.attendees && event.attendees.length > 0) {
            attendeesEl.innerHTML = event.attendees.map(att => {
                const statusEmoji = {
                    'accepted': '✔️',
                    'declined': '❌',
                    'tentative': '❓',
                    'needsAction': '⚪'
                }[att.responseStatus] || '⚪';
                const displayName = att.displayName || att.email.split('@')[0]; // Use display name if available, else part of email
                return `
                    <tr class="hover:bg-gray-700">
                        <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-300">${statusEmoji}</td>
                        <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-300">${displayName}</td>
                        <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-400">${att.email}</td>
                    </tr>
                `;
            }).join('');
        } else {
            attendeesEl.innerHTML = `<tr><td colspan="3" class="px-4 py-2 text-sm text-gray-400 text-center">No attendee information available.</td></tr>`;
        }
    }
    
    dom.findElOrLog('event-detail-gcal-link', 'showEventDetails').href = event.htmlLink;
    
    const self = event.attendees?.find(a => a.self);
    const acceptBtn = dom.findElOrLog('event-detail-accept-btn', 'showEventDetails');
    const declineBtn = dom.findElOrLog('event-detail-decline-btn', 'showEventDetails');

    // Reset button states
    acceptBtn.classList.add('hidden');
    declineBtn.classList.add('hidden');
    acceptBtn.onclick = null;
    declineBtn.onclick = null;

    if (self) {
        if (self.responseStatus === 'accepted') {
            declineBtn.classList.remove('hidden');
            declineBtn.onclick = () => {
                showConfirmationModal('Decline Meeting?', `Are you sure you want to decline "${event.summary || 'this meeting'}"?`, async () => {
                    try {
                        await api.declineMeeting({ eventId: event.id, calendarId: event.organizer.email, attendeeEmail: self.email });
                        window.electronAPI.ui.showToast({ type: 'success', message: 'Meeting declined!' });
                        closeModal('details-modal');
                        requestCalendarRefresh();
                    } catch (err) {
                        window.electronAPI.ui.showToast({ type: 'error', message: 'Failed to decline meeting: ' + err.message });
                    }
                });
            };
        } else { // 'declined', 'tentative', 'needsAction'
            acceptBtn.classList.remove('hidden');
            declineBtn.classList.remove('hidden'); // Always show decline if not accepted

            acceptBtn.onclick = async () => {
                try {
                    await api.acceptMeeting({ eventId: event.id, calendarId: event.organizer.email, attendeeEmail: self.email });
                    window.electronAPI.ui.showToast({ type: 'success', message: 'Meeting accepted!' });
                    closeModal('details-modal');
                    requestCalendarRefresh();
                } catch (err) {
                    window.electronAPI.ui.showToast({ type: 'error', message: 'Failed to accept meeting: ' + err.message });
                }
            };
            declineBtn.onclick = () => {
                showConfirmationModal('Decline Meeting?', `Are you sure you want to decline "${event.summary || 'this meeting'}"?`, async () => {
                    try {
                        await api.declineMeeting({ eventId: event.id, calendarId: event.organizer.email, attendeeEmail: self.email });
                        window.electronAPI.ui.showToast({ type: 'success', message: 'Meeting declined!' });
                        closeModal('details-modal');
                        requestCalendarRefresh();
                    } catch (err) {
                        window.electronAPI.ui.showToast({ type: 'error', message: 'Failed to decline meeting: ' + err.message });
                    }
                });
            };
        }
    } else {
        // If 'self' attendee is not found, maybe show no buttons or just the Google Calendar link
        // For now, buttons remain hidden as per initial state
    }
    
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
    // Ensure the event listener is re-attached cleanly
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    newConfirmBtn.addEventListener('click', () => {
        onConfirm();
        closeModal('confirmation-modal');
    });
    
    // Attach event listener for cancel button too, if not already handled in main.js
    const cancelBtn = dom.findElOrLog('confirm-cancel-btn', 'showConfirmationModal');
    // Ensure the event listener is re-attached cleanly for cancel button
    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    newCancelBtn.addEventListener('click', () => {
        closeModal('confirmation-modal');
    });

    dom.findElOrLog('confirmation-modal', 'showConfirmationModal').classList.remove('hidden');
}