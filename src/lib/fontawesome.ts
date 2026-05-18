import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";

// Prevent FA from auto-injecting CSS during SSR. We import the stylesheet manually above.
config.autoAddCss = false;
