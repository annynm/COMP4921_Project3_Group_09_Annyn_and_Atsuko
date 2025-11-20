let currentYear, currentMonth;
let selectedDate = null;
let selectedDayElement = null;

document.addEventListener("DOMContentLoaded", function() {
  const urlParams = new URLSearchParams(window.location.search);
  const now = new Date();
  currentYear = parseInt(urlParams.get("year")) || now.getFullYear();
  currentMonth = parseInt(urlParams.get("month")) || now.getMonth();

  updateMonthDisplay();
  setupNavigation();
});

function setupNavigation() {
  document.getElementById("prevMonth").addEventListener("click", function() {
    navigateMonth(-1);
  });

  document.getElementById("nextMonth").addEventListener("click", function() {
    navigateMonth(1);
  });

  document
    .getElementById("closeDayView")
    .addEventListener("click", closeDayView);
}

function navigateMonth(direction) {
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
  const url = `/calendar?year=${currentYear}&month=${currentMonth}`;
  window.history.pushState({}, "", url);
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
  fetch(`/calendar/grid?year=${currentYear}&month=${currentMonth}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.text();
    })
    .then((html) => {
      const calendarGrid = document.getElementById("calendarGrid");

      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = html;

      const newCalendarContent = tempDiv.querySelector(".calendar-grid");

      if (newCalendarContent) {
        calendarGrid.innerHTML = newCalendarContent.innerHTML;
      }

      updateMonthDisplay();
    })
    .catch((error) => {
      console.error("Error loading calendar grid:", error);
      window.location.href = `/calendar?year=${currentYear}&month=${currentMonth}`;
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
      dayViewContainer.classList.add("active");
      document.getElementById("dayViewTitle").textContent = data.dayName;

      renderDayView(data.events || [], date);
    })
    .catch((error) => console.error("Day fetch error:", error));
}

function insertDayViewAfterWeek(clickedDayElement) {
  const dayViewContainer = document.getElementById("dayViewContainer");
  const calendarGrid = document.getElementById("calendarGrid");

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

  if (lastDayOfWeek.nextSibling) {
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

  setTimeout(() => {
    document.getElementById("dayViewContainer").classList.remove("active");
  }, 300);
}

function addTimeSlotClickHandlers(date) {
  setTimeout(() => {
    const timeGrid = document.querySelector(".time-grid");
    if (!timeGrid) return;

    const hourSlots = timeGrid.querySelectorAll(".hour-slot");
    hourSlots.forEach((slot) => {
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
  dayViewContainer.style.display = "none";

  if (selectedDayElement) {
    selectedDayElement.classList.remove("selected");
    selectedDayElement = null;
  }

  selectedDate = null;
}

window.addEventListener("popstate", function() {
  const urlParams = new URLSearchParams(window.location.search);
  const newYear = parseInt(urlParams.get("year"));
  const newMonth = parseInt(urlParams.get("month"));

  if (
    newYear &&
    newMonth &&
    (newYear !== currentYear || newMonth !== currentMonth)
  ) {
    currentYear = newYear;
    currentMonth = newMonth;
    closeDayView();
    loadCalendarGrid();
  }
});
