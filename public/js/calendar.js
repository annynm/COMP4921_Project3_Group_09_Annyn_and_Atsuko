// Global variables
let currentYear, currentMonth;
let selectedDate = null;

// Initialize on page load
document.addEventListener("DOMContentLoaded", function() {
  const urlParams = new URLSearchParams(window.location.search);
  const now = new Date();
  currentYear = parseInt(urlParams.get("year")) || now.getFullYear();
  currentMonth = parseInt(urlParams.get("month")) || now.getMonth();

  loadCalendar();
  setupNavigation();
});

function setupNavigation() {
  document.getElementById("prevMonth").addEventListener("click", function() {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    updateURL();
    loadCalendar();
  });

  document.getElementById("nextMonth").addEventListener("click", function() {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    updateURL();
    loadCalendar();
  });

  document
    .getElementById("closeDayView")
    .addEventListener("click", closeDayView);
}

function updateURL() {
  const url = `/calendar?year=${currentYear}&month=${currentMonth}`;
  window.history.pushState({}, "", url);
}

function loadCalendar() {
  const monthName = new Date(currentYear, currentMonth).toLocaleDateString(
    "en-US",
    {
      month: "long",
      year: "numeric",
    },
  );
  document.getElementById("currentMonth").textContent = monthName;

  document.getElementById("calendarGrid").style.display = "grid";
}

function loadDayView(date) {
  selectedDate = date;

  fetch(`/calendar/api?date=${date}`)
    .then((response) => response.json())
    .then((data) => {
      if (data.error) {
        console.error("Day view error:", data.error);
        return;
      }

      document.getElementById("calendarGrid").style.display = "none";
      document.querySelector(".calendar-nav").style.display = "none";

      const dayViewContainer = document.getElementById("dayViewContainer");
      dayViewContainer.style.display = "block";

      document.getElementById("dayViewTitle").textContent = data.dayName;

      renderDayView(data.events || [], date);

      renderRemainingWeeks(date);
    })
    .catch((error) => console.error("Day fetch error:", error));
}

function renderDayView(events, date) {
  const container = document.getElementById("dayViewContent");

  let html = '<div class="day-view">';
  html += '<div class="time-grid">';

  for (let hour = 0; hour < 24; hour++) {
    const hourStart = hour * 60;
    const halfHour = hourStart + 30;
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
        start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
        " - " +
        end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
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
        const minute = Math.floor((y / 60) * 60); // Convert pixel to minute

        const roundedMinute = Math.round(minute / 15) * 15;

        const bookingUrl = `/events/book?date=${date}&hour=${hour}&minute=${roundedMinute}`;
        window.location.href = bookingUrl;
      });
    });
  }, 100);
}

function renderRemainingWeeks(selectedDate) {
  const container = document.getElementById("remainingWeeks");
  container.innerHTML =
    '<div style="text-align: center; margin: 2rem 0;"><hr><p style="color: var(--text-secondary);">Remaining weeks view would go here</p></div>';
}

function closeDayView() {
  document.getElementById("dayViewContainer").style.display = "none";
  document.getElementById("calendarGrid").style.display = "grid";
  document.querySelector(".calendar-nav").style.display = "flex";
  document.getElementById("remainingWeeks").innerHTML = "";
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
    loadCalendar();
    closeDayView();
  }
});
