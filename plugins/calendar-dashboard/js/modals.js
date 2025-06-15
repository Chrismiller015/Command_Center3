// plugins/calendar-dashboard/js/modals.js
console.log('[Calendar Plugin] modals.js file PARSED.');

import * as dom from './dom.js';
import * as utils from './utils.js';
import * as api from './api.js'; // Ensure api is imported

let detailsModal, modalTitle, modalTime, modalLocation, modalDescription, modalAttendees, modalActions, closeDetailsModal, acceptBtn, declineBtn;
let copyAllAttendeesBtn, showMoreAttendeesBtn; // New variables for new buttons

const MAX_ATTENDEES_DISPLAY = 5; // Define max rows for attendees table

// Function to handle copying text to clipboard
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        console.log(`[Calendar Plugin] Copied to clipboard: ${text}`);
        window.api.showToast('Copied to clipboard!', 'success'); // CHANGED: Use window.api.showToast
    } catch (err) {
        console.error('[Calendar Plugin] Failed to copy to clipboard:', err);
        window.api.showToast('Failed to copy', 'error'); // CHANGED: Use window.api.showToast
    }
}


export function init() {
    console.log('[Calendar Plugin] modals.js init function called. Looking for modal elements...');
    detailsModal = dom.findElOrLog('details-modal', 'modals.js');
    modalTitle = dom.findElOrLog('modal-title', 'modals.js');
    modalTime = dom.findElOrLog('modal-time', 'modals.js');
    modalLocation = dom.findElOrLog('modal-location', 'modals.js');
    modalDescription = dom.findElOrLog('modal-description', 'modals.js');
    modalAttendees = dom.findElOrLog('modal-attendees', 'modals.js');
    modalActions = dom.findElOrLog('modal-actions', 'modals.js');
    closeDetailsModal = dom.findElOrLog('close-details-modal', 'modals.js');
    acceptBtn = dom.findElOrLog('accept-btn', 'modals.js');
    declineBtn = dom.findElOrLog('decline-btn', 'modals.js');
    // Initialize new buttons
    copyAllAttendeesBtn = dom.findElOrLog('copy-all-attendees-btn', 'modals.js');
    showMoreAttendeesBtn = dom.findElOrLog('show-more-attendees-btn', 'modals.js');


    if (closeDetailsModal) {
        closeDetailsModal.addEventListener('click', () => {
            detailsModal.classList.add('hidden');
        });
    } else {
        console.warn("[Calendar Plugin] closeDetailsModal element not found during init.");
    }
}


export function showEventDetails(event) {
    console.log(`[Calendar Plugin] showEventDetails called for event: ${event.summary || 'No Title'}`);
    // Ensure elements are available before proceeding. This acts as a safeguard.
    if (!detailsModal || !modalTitle || !modalTime || !modalLocation || !modalDescription || !modalAttendees || !modalActions || !closeDetailsModal || !acceptBtn || !declineBtn || !copyAllAttendeesBtn || !showMoreAttendeesBtn) {
        console.error("[Calendar Plugin] One or more modal elements not found in showEventDetails. Attempting re-initialization...");
        init(); // Attempt to re-initialize if not found
        // Re-check after re-initialization
        if (!detailsModal || !modalTitle || !modalTime || !modalLocation || !modalDescription || !modalAttendees || !modalActions || !closeDetailsModal || !acceptBtn || !declineBtn || !copyAllAttendeesBtn || !showMoreAttendeesBtn) {
             console.error("[Calendar Plugin] Re-initialization failed. Cannot show modal.");
             return;
        }
    }

    modalTitle.textContent = event.summary || 'No Title';
    modalTime.textContent = utils.formatEventTime(event);
    modalLocation.textContent = event.location || 'No location specified';
    modalLocation.classList.toggle('hidden', !event.location);

    // Description with "show more" functionality
    if (event.description) {
        modalDescription.innerHTML = utils.formatDescription(event.description);

        const showMoreLink = modalDescription.querySelector('a.show-more-link');
        const truncatedContent = modalDescription.querySelector('span.truncated-content'); 

        if (showMoreLink && truncatedContent) {
            // Initially hide the remaining content part
            truncatedContent.style.display = 'none';

            showMoreLink.addEventListener('click', (e) => {
                e.preventDefault(); // Prevent default link behavior
                if (truncatedContent.style.display === 'none') {
                    truncatedContent.style.display = 'inline'; // Or 'block' depending on desired layout
                    showMoreLink.textContent = 'Show Less';
                } else {
                    truncatedContent.style.display = 'none';
                    showMoreLink.textContent = 'Show More';
                }
            });
        }
    } else {
        modalDescription.innerHTML = '<p class="text-gray-400 text-sm mt-2">No description available.</p>';
    }

    // Attendees Table and Copy Button
    const attendeesTableBody = modalAttendees; 
    attendeesTableBody.innerHTML = ''; // Clear existing table rows
    const uniqueEmails = new Set();
    
    // Clear previous show more button state
    showMoreAttendeesBtn.classList.add('hidden');
    showMoreAttendeesBtn.textContent = 'Show More'; // Reset text

    if (event.attendees && event.attendees.length > 0) {
        event.attendees.forEach((attendee, index) => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-700'; 

            let statusIcon = '';
            let statusClass = '';

            switch (attendee.responseStatus) {
                case 'accepted': statusIcon = '✅'; statusClass = 'text-green-400'; break;
                case 'declined': statusIcon = '❌'; statusClass = 'text-red-400'; break;
                case 'tentative': statusIcon = '❓'; statusClass = 'text-yellow-400'; break;
                default: statusIcon = '✉️'; statusClass = 'text-gray-400'; break;
            }

            const name = attendee.displayName || attendee.email;
            const email = attendee.email;
            
            // Status Cell
            const statusCell = document.createElement('td');
            statusCell.className = 'px-4 py-2 whitespace-nowrap text-sm font-medium';
            statusCell.innerHTML = `<span class="${statusClass}">${statusIcon}</span>`;
            row.appendChild(statusCell);

            // Name Cell
            const nameCell = document.createElement('td');
            nameCell.className = 'px-4 py-2 whitespace-nowrap text-sm text-gray-300';
            nameCell.textContent = name;
            if (attendee.self) {
                nameCell.classList.add('font-bold'); 
            }
            row.appendChild(nameCell);

            // Email Cell (clickable)
            const emailCell = document.createElement('td');
            emailCell.className = 'px-4 py-2 whitespace-nowrap text-sm text-gray-300';
            const emailSpan = document.createElement('span');
            emailSpan.textContent = email;
            emailSpan.className = 'cursor-pointer hover:underline';
            emailSpan.title = 'Click to copy email';
            emailSpan.addEventListener('click', () => copyToClipboard(email));
            emailCell.appendChild(emailSpan);
            row.appendChild(emailCell);

            // Truncate logic
            if (index >= MAX_ATTENDEES_DISPLAY) {
                row.classList.add('hidden-attendee-row'); // Add class to hide by default
            }

            attendeesTableBody.appendChild(row);
            uniqueEmails.add(email);
        });

        // "Copy All Attendees" Button logic
        copyAllAttendeesBtn.classList.remove('hidden');
        copyAllAttendeesBtn.onclick = () => copyToClipboard(Array.from(uniqueEmails).join('; '));

        // "Show More Attendees" Button logic
        if (event.attendees.length > MAX_ATTENDEES_DISPLAY) {
            showMoreAttendeesBtn.classList.remove('hidden');
            showMoreAttendeesBtn.onclick = () => {
                const hiddenRows = attendeesTableBody.querySelectorAll('.hidden-attendee-row');
                if (hiddenRows.length > 0) {
                    hiddenRows.forEach(row => row.classList.remove('hidden-attendee-row'));
                    showMoreAttendeesBtn.textContent = 'Show Less';
                } else {
                    // If all are shown, hide them again
                    event.attendees.forEach((attendee, index) => {
                        if (index >= MAX_ATTENDEES_DISPLAY) {
                            attendeesTableBody.children[index].classList.add('hidden-attendee-row');
                        }
                    });
                    showMoreAttendeesBtn.textContent = 'Show More';
                }
            };
        }

    } else {
        attendeesTableBody.innerHTML = '<tr><td colspan="3" class="px-4 py-2 text-gray-400 text-center">No attendees listed.</td></tr>';
        copyAllAttendeesBtn.classList.add('hidden'); // Hide if no attendees
    }

    // Actions (View in Google Calendar, RSVP buttons)
    // Clear previous actions first
    modalActions.innerHTML = ''; 

    // Add Google Calendar button (always present if htmlLink exists)
    if (event.htmlLink) {
        const viewInCalendarBtn = document.createElement('button');
        viewInCalendarBtn.className = 'btn btn-secondary mr-2'; 
        viewInCalendarBtn.textContent = 'Google Calendar'; // Changed text to "Google Calendar"
        viewInCalendarBtn.onclick = () => window.electronAPI.openExternalLink(event.htmlLink);
        modalActions.appendChild(viewInCalendarBtn);
    }

    // RSVP buttons (Conditional display)
    if (event.attendees && event.attendees.some(a => a.self)) {
        const selfAttendee = event.attendees.find(a => a.self);
        
        // Clone new buttons to ensure fresh event listeners
        const newAcceptBtn = acceptBtn.cloneNode(true);
        const newDeclineBtn = declineBtn.cloneNode(true);

        // Remove previous references from DOM
        // This is crucial to prevent duplicate listeners if `acceptBtn` or `declineBtn` 
        // refer to previous elements that were already appended to `modalActions`.
        if (acceptBtn.parentNode && acceptBtn.parentNode === modalActions) {
            modalActions.removeChild(acceptBtn);
        }
        if (declineBtn.parentNode && declineBtn.parentNode === modalActions) {
            modalActions.removeChild(declineBtn);
        }

        // Clear active classes from cloned buttons
        newAcceptBtn.classList.remove('btn-active');
        newDeclineBtn.classList.remove('btn-active');

        // Conditional display and appending
        if (selfAttendee.responseStatus === 'accepted') {
            newAcceptBtn.classList.add('hidden'); // Hide accepted button
            newDeclineBtn.classList.remove('hidden'); // Show decline button
            modalActions.appendChild(newDeclineBtn);
        } else if (selfAttendee.responseStatus === 'declined') {
            newAcceptBtn.classList.remove('hidden'); // Show accept button
            newDeclineBtn.classList.add('hidden'); // Hide declined button
            modalActions.appendChild(newAcceptBtn);
        } else { // tentative, needsAction, or other statuses
            newAcceptBtn.classList.remove('hidden'); // Show both
            newDeclineBtn.classList.remove('hidden'); // Show both
            modalActions.appendChild(newDeclineBtn);
            modalActions.appendChild(newAcceptBtn);
        }

        newAcceptBtn.onclick = async () => {
            console.log("[Calendar Plugin] Accepting event...");
            await api.updateEventResponse(event.id, 'accepted'); // Use api.updateEventResponse
            detailsModal.classList.add('hidden');
            window.api.showToast('Event accepted!', 'success'); // CHANGED: Use window.api.showToast
            window.dispatchEvent(new CustomEvent('calendar-refresh-requested'));
        };
        newDeclineBtn.onclick = async () => {
            console.log("[Calendar Plugin] Declining event...");
            await api.updateEventResponse(event.id, 'declined'); // Use api.updateEventResponse
            detailsModal.classList.add('hidden');
            window.api.showToast('Event declined!', 'info'); // CHANGED: Use window.api.showToast
            window.dispatchEvent(new CustomEvent('calendar-refresh-requested'));
        };

        // Update references to the new buttons for next call
        acceptBtn = newAcceptBtn;
        declineBtn = newDeclineBtn;

    } else {
        // If no self attendee, ensure buttons are hidden
        acceptBtn.classList.add('hidden');
        declineBtn.classList.add('hidden');
    }

    detailsModal.classList.remove('hidden');
}


// Calendar Settings Modal functionality
let calendarsModal, closeCalendarsModal, calendarsList;

export function initCalendarsModal() {
    console.log('[Calendar Plugin] modals.js initCalendarsModal function called. Looking for elements...');
    calendarsModal = dom.findElOrLog('calendars-modal', 'modals.js');
    closeCalendarsModal = dom.findElOrLog('calendars-modal-close-btn', 'modals.js'); 
    calendarsList = dom.findElOrLog('calendars-list', 'modals.js');

    if (closeCalendarsModal) {
        closeCalendarsModal.addEventListener('click', () => {
            calendarsModal.classList.add('hidden');
        });
    } else {
        console.warn("[Calendar Plugin] closeCalendarsModal element not found during initCalendarsModal.");
    }
}


export async function openCalendarsModal() {
    if (!calendarsModal || !calendarsList) {
        console.error("[Calendar Plugin] Calendars modal elements not found in openCalendarsModal. Attempting re-initialization...");
        initCalendarsModal(); // Attempt to re-initialize
        if (!calendarsModal || !calendarsList) {
            console.error("[Calendar Plugin] Re-initialization failed. Cannot open calendars modal.");
            return;
        }
    }

    try {
        const calendars = await window.electronAPI.getPluginSetting('calendar-dashboard', 'availableCalendars');
        const enabledCalendarIds = new Set(await window.electronAPI.getPluginSetting('calendar-dashboard', 'enabledCalendarIds') || []);

        calendarsList.innerHTML = ''; // Clear existing list

        if (calendars && calendars.length > 0) {
            calendars.forEach(cal => {
                const li = document.createElement('li');
                li.className = 'flex items-center justify-between p-2 hover:bg-gray-700 rounded-md';

                const checkboxContainer = document.createElement('div');
                checkboxContainer.className = 'flex items-center';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `calendar-${cal.id}`;
                checkbox.className = 'form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out cursor-pointer';
                checkbox.checked = enabledCalendarIds.has(cal.id);
                checkbox.style.borderColor = cal.backgroundColor;
                checkbox.style.backgroundColor = enabledCalendarIds.has(cal.id) ? cal.backgroundColor : 'transparent';
                checkbox.style.color = cal.backgroundColor; // For the checkmark color

                // Update background color when checked/unchecked
                checkbox.addEventListener('change', () => {
                    if (checkbox.checked) {
                        checkbox.style.backgroundColor = cal.backgroundColor;
                    } else {
                        checkbox.style.backgroundColor = 'transparent';
                    }
                    updateCalendarSetting(cal.id, checkbox.checked);
                });

                const label = document.createElement('label');
                label.htmlFor = `calendar-${cal.id}`;
                label.className = 'ml-2 text-white cursor-pointer flex-grow truncate';
                label.textContent = cal.summary;
                label.title = cal.summary;

                // Color swatch
                const colorSwatch = document.createElement('span');
                colorSwatch.className = 'w-4 h-4 rounded-full mr-2';
                colorSwatch.style.backgroundColor = cal.backgroundColor;

                checkboxContainer.appendChild(colorSwatch);
                checkboxContainer.appendChild(checkbox);
                checkboxContainer.appendChild(label);
                
                li.appendChild(checkboxContainer);

                calendarsList.appendChild(li);
            });
        } else {
            calendarsList.innerHTML = '<p class="text-gray-400 text-sm">No calendars found. Please ensure you have granted calendar permissions.</p>';
        }

        calendarsModal.classList.remove('hidden');
    } catch (error) {
        console.error("[Calendar Plugin] Error loading calendars for modal:", error);
        window.electronAPI.showToast('Error loading calendars.', 'error');
    }
}

async function updateCalendarSetting(calendarId, isEnabled) {
    try {
        const enabledCalendarIds = new Set(await window.electronAPI.getPluginSetting('calendar-dashboard', 'enabledCalendarIds') || []);
        if (isEnabled) {
            enabledCalendarIds.add(calendarId);
        } else {
            enabledCalendarIds.delete(calendarId);
        }
        await window.electronAPI.setPluginSetting('calendar-dashboard', 'enabledCalendarIds', Array.from(enabledCalendarIds));
        window.api.showToast('Calendar preferences updated.', 'success'); // CHANGED: Use window.api.showToast
        window.dispatchEvent(new CustomEvent('calendar-refresh-requested')); // Request a refresh of the calendar view
    } catch (error) {
        console.error(`[Calendar Plugin] Error updating calendar setting for ${calendarId}:`, error);
        window.api.showToast('Failed to update calendar setting.', 'error'); // CHANGED: Use window.api.showToast
    }
}