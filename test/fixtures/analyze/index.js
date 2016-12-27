// external module
import "react";
import "react/lib/aaa";
import "react/lib/bbb.js";
import "react/lib/ccc.jsx";

import "~react-dom";

// external module (scss)
import "@scope/next/index.scss";
import "@scope/next/lib/button/index.scss";

// relative files
import "./lib/a";     // a.js
import "./lib/b";     // b.jsx
import "./lib/c.js";  // c.js
import "./lib/d.jsx"; // d.jsx

// relative files
import "./lib/a.scss";  // a.scss

// other file
import "@scope/xxx/mock.json";
import "./lib/x.json";
