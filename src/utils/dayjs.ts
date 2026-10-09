import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

// Pin the frontend's "today" / weekday-name semantics to the
// institute's calendar timezone. Without this, dayjs(a.date).format(...)
// interprets the API-supplied ISO string in the BROWSER's local TZ —
// an admin viewing the kiosk from a UTC workstation would see
// attendance rows under the wrong weekday even after the backend
// stores the right date.
//
// This module is imported once from `app/layout.tsx` (side-effect
// import) so the config applies globally. Subsequent `import dayjs`
// calls anywhere else pick up the extended instance via module
// caching.
dayjs.extend(utc);
dayjs.extend(timezone);

// Set the default TZ for every `dayjs()`, `dayjs.tz()`, and
// `.format()` call. Same anchor as the backend (Asia/Dhaka) so
// round-trips stay in sync.
dayjs.tz.setDefault("Asia/Dhaka");

export default dayjs;