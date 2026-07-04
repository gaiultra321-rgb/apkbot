export function mainMenu() {
  return {
    inline_keyboard: [
      [{ text: "1. Link to App", callback_data: "mode_link" }],
      [{ text: "2. HTML/Zip to App", callback_data: "mode_html" }],
      [{ text: "3. Java/Kotlin Native App", callback_data: "mode_native" }],
    ],
  };
}

export function defaultBtn(typeKey) {
  const map = {
    name: { text: "Use Default Name", callback_data: "def_name" },
    icon: { text: "Use Default Icon", callback_data: "def_icon" },
    splash: { text: "Use Default Splash", callback_data: "def_splash" },
  };
  return { inline_keyboard: [[map[typeKey]]] };
}

const PERMS = {
  camera: "Camera",
  geolocation: "Location",
  media: "Microphone",
  contacts: "Contacts",
  call: "Make Calls",
  storage: "Files & Media",
  bluetooth: "Bluetooth",
  internet: "Internet",
  sms: "Read SMS",
  vibrate: "Vibrate",
  notification: "Notifications",
  record_audio: "Record Audio",
};

export function permKeyboard(selectedPerms) {
  const rows = [];
  let row = [];
  for (const [key, label] of Object.entries(PERMS)) {
    const text = selectedPerms.includes(key) ? `[X] ${label}` : `[ ] ${label}`;
    row.push({ text, callback_data: `perm_${key}` });
    if (row.length === 2) {
      rows.push(row);
      row = [];
    }
  }
  if (row.length) rows.push(row);
  rows.push([{ text: "BUILD APK NOW", callback_data: "build_final" }]);
  return { inline_keyboard: rows };
}
