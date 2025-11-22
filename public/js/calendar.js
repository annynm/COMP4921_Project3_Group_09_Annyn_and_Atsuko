let currentYear, currentMonth;
let selectedDate = null;
let selectedDayElement = null;

document.addEventListener("DOMContentLoaded", function() {
  const urlParams = new URLSearchParams(window.location.search);
  const now = new Date();

  const parsedYear = parseInt(urlParams.get("year"));
  const parsedMonth = parseInt(urlParams.get("month")); // expected 1-12 in URL

  currentYear = !isNaN(parsedYear) ? parsedYear : now.getFullYear();
  if (!isNaN(parsedMonth)) {
    // convert 1-12 (URL) to 0-11 internal
    currentMonth = parsedMonth - 1;
  } else {
    currentMonth = now.getMonth();
  }

  updateMonthDisplay();
  setupNavigation();
  // load initial grid if you want to rely on AJAX for initial load:
  // loadCalendarGrid(); // Commented out because page already rendered server-side
});

function setupNavigation() {
  // Prev / Next should navigate the page (full load) using 1-12 month in URL
  document.getElementById("prevMonth").addEventListener("click", function() {
    let targetMonth = currentMonth - 1;
    let targetYear = currentYear;
    if (targetMonth < 0) {
      targetMonth = 11;
      targetYear--;
    }
    // URL month is 1-12
    window.location.href = `/calendar?year=${targetYear}&month=${targetMonth + 1}`;
  });

  document.getElementById("nextMonth").addEventListener("click", function() {
    let targetMonth = currentMonth + 1;
    let targetYear = currentYear;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear++;
    }
    window.location.href = `/calendar?year=${targetYear}&month=${targetMonth + 1}`;
  });

  document
    .getElementById("closeDayView")
    .addEventListener("click", closeDayView);
}

function navigateMonth(direction) {
  // kept for backward compatibility but not used by prev/next buttons anymore
  currentMonth += direction;

  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  } else if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }

  updateCalendar();
}

function updateCalendar() {
  updateURL();
  closeDayView();
  loadCalendarGrid();
}

function updateURL() {
  // send month as 1-12 in URL
  const url = `/calendar?year=${currentYear}&month=${currentMonth + 1}`;
  window.history.pushState({}, "", url);
  updateMonthDisplay();
}

function updateMonthDisplay() {
  const monthName = new Date(currentYear, currentMonth).toLocaleDateString(
    "en-US",
    {
      month: "long",
      year: "numeric",
    },
  );
  document.getElementById("currentMonth").textContent = monthName;
}

function loadCalendarGrid() {
  fetch(`/calendar/grid?year=${currentYear}&month=${currentMonth + 1}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.text();
    })
    .then((html) => {
      // Replace the entire calendar grid content
      document.getElementById("calendarGrid").innerHTML = html;

      // Re-attach event listeners to the new day elements
      attachDayClickListeners();
    })
    .catch((error) => {
      console.error("Error loading calendar grid:", error);
      // Redirect to a full page for fallback — ensure month is 1-12 here
      window.location.href = `/calendar?year=${currentYear}&month=${currentMonth + 1}`;
    });
}

function attachDayClickListeners() {
  // Attach click listeners to all calendar day elements (including empties are okay
  // but we only bind to non-empty ones below)
  const dayElements = document.querySelectorAll(".calendar-day:not(.empty)");
  dayElements.forEach((dayElement) => {
    // Replace node to remove previous listeners
    dayElement.replaceWith(dayElement.cloneNode(true));
  });

  // Re-attach listeners to the new elements
  const newDayElements = document.querySelectorAll(".calendar-day:not(.empty)");
  newDayElements.forEach((dayElement) => {
    dayElement.addEventListener("click", function() {
      const date = this.getAttribute("data-date");
      loadDayView(this, date);
    });
  });
}

function loadDayView(element, date) {
  if (selectedDate === date) {
    closeDayView();
    return;
  }

  if (selectedDayElement) {
    selectedDayElement.classList.remove("selected");
  }

  selectedDayElement = element;
  selectedDayElement.classList.add("selected");
  selectedDate = date;

  fetch(`/calendar/api?date=${date}`)
    .then((response) => response.json())
    .then((data) => {
      if (data.error) {
        console.error("Day view error:", data.error);
        return;
      }

      const dayViewContainer = document.getElementById("dayViewContainer");
      insertDayViewAfterWeek(element);

      dayViewContainer.style.display = "block";
      document.getElementById("dayViewTitle").textContent = data.dayName;

      renderDayView(data.events || [], date);
    })
    .catch((error) => console.error("Day fetch error:", error));
}

function insertDayViewAfterWeek(clickedDayElement) {
  const dayViewContainer = document.getElementById("dayViewContainer");
  const calendarGrid = document.getElementById("calendarGrid");

  // Use all calendar-day nodes (including .empty) so week computation matches grid columns
  const dayElements = Array.from(
    calendarGrid.querySelectorAll(".calendar-day"),
  );
  const clickedIndex = dayElements.indexOf(clickedDayElement);

  if (clickedIndex === -1) return;

  const daysPerWeek = 7;
  const weekIndex = Math.floor(clickedIndex / daysPerWeek);

  const lastDayIndex = Math.min(
    (weekIndex + 1) * daysPerWeek - 1,
    dayElements.length - 1,
  );
  const lastDayOfWeek = dayElements[lastDayIndex];

  // Remove from current position if it exists elsewhere
  if (dayViewContainer.parentNode) {
    dayViewContainer.parentNode.removeChild(dayViewContainer);
  }

  // Insert after the last day of the week. We use nextSibling logic to put it directly after.
  if (lastDayOfWeek && lastDayOfWeek.nextSibling) {
    calendarGrid.insertBefore(dayViewContainer, lastDayOfWeek.nextSibling);
  } else {
    calendarGrid.appendChild(dayViewContainer);
  }
}

function renderDayView(events, date) {
  const container = document.getElementById("dayViewContent");

  let html = '<div class="day-view">';
  html += '<div class="time-grid">';

  for (let hour = 0; hour < 24; hour++) {
    const hourStart = hour * 60;
    const quarter1 = hourStart + 15;
    const quarter2 = hourStart + 45;

    html += '<div class="hour-slot" data-hour="' + hour + '">';
    html += '<div class="hour-label">' + hour + ":00</div>";
    html += '<div class="half-hour" data-time="' + quarter1 + '"></div>';
    html += '<div class="quarter-hour" data-time="' + quarter1 + '"></div>';
    html += '<div class="quarter-hour" data-time="' + quarter2 + '"></div>';
    html += "</div>";
  }

  html += "</div>";

  if (events && events.length > 0) {
    events.forEach(function(event) {
      const start = new Date(event.start_datetime);
      const end = new Date(event.end_datetime);
      const startMinutes = start.getHours() * 60 + start.getMinutes();
      const duration = (end - start) / (1000 * 60);
      const top = (startMinutes / 60) * 60;
      const height = (duration / 60) * 60;

      html += '<div class="event-overlay" ';
      html +=
        'style="top: ' +
        top +
        "px; height: " +
        height +
        "px; background: " +
        (event.color || "var(--greendale-blue)") +
        ';" ';
      html +=
        "onclick=\"window.location.href='/event/" + event.event_id + "'\">";
      html += '<div class="event-overlay-name">' + event.event_name + "</div>";
      html +=
        '<div class="event-overlay-time">' +
        start.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }) +
        " - " +
        end.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }) +
        "</div>";
      if (event.room_name) {
        html += '<div class="event-overlay-room">' + event.room_name + "</div>";
      }
      html += "</div>";
    });
  }

  html += "</div>";

  container.innerHTML = html;
  addTimeSlotClickHandlers(date);
}

function addTimeSlotClickHandlers(date) {
  setTimeout(() => {
    const timeGrid = document.querySelector(".time-grid");
    if (!timeGrid) return;

    const hourSlots = timeGrid.querySelectorAll(".hour-slot");
    hourSlots.forEach((slot) => {
      // Remove existing listeners
      slot.replaceWith(slot.cloneNode(true));
    });

    // Re-attach listeners to new elements
    const newHourSlots = document.querySelectorAll(".hour-slot");
    newHourSlots.forEach((slot) => {
      slot.addEventListener("click", function(e) {
        if (
          e.target.classList.contains("event-overlay") ||
          e.target.closest(".event-overlay")
        ) {
          return;
        }

        const hour = parseInt(this.dataset.hour);
        const rect = this.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const minute = Math.floor((y / 60) * 60);
        const roundedMinute = Math.round(minute / 15) * 15;

        const bookingUrl = `/events/book?date=${date}&hour=${hour}&minute=${roundedMinute}`;
        window.location.href = bookingUrl;
      });
    });
  }, 100);
}

function closeDayView() {
  const dayViewContainer = document.getElementById("dayViewContainer");
  if (dayViewContainer) {
    dayViewContainer.style.display = "none";
  }

  if (selectedDayElement) {
    selectedDayElement.classList.remove("selected");
    selectedDayElement = null;
  }

  selectedDate = null;
}

// Event delegation for dynamically created elements
document.addEventListener("click", function(e) {
  // Handle mini-event clicks (events inside day boxes)
  if (e.target.closest(".mini-event")) {
    e.preventDefault();
    e.stopPropagation();
    const miniEvent = e.target.closest(".mini-event");
    // The mini-event click navigates by the onclick attribute in the template
    return;
  }
});

window.addEventListener("popstate", function() {
  const urlParams = new URLSearchParams(window.location.search);
  const newYear = parseInt(urlParams.get("year"));
  const newMonthParam = parseInt(urlParams.get("month")); // 1-12 from URL

  if (!isNaN(newYear) && !isNaN(newMonthParam)) {
    const newMonth = newMonthParam - 1; // convert to 0-11
    if (newYear !== currentYear || newMonth !== currentMonth) {
      currentYear = newYear;
      currentMonth = newMonth;
      closeDayView();
      loadCalendarGrid();
    }
  }
});
