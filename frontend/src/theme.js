import { createTheme } from "@mui/material/styles";
import {
  green,
  amber,
  red,
  orange,
  deepPurple,
  grey,
  blue,
} from "@mui/material/colors";
import { URGENCY_VALUES } from "./utils/consts";

export const URGENCY_COLORS = {
  [URGENCY_VALUES.ROUTINE]: green[800],
  [URGENCY_VALUES.SEMI_URGENT]: orange[800],
  [URGENCY_VALUES.URGENT]: red[800],
};

export const TABLE_COLORS = {
  headerBackground: deepPurple[100],
  background: deepPurple[50],
  rowHover: deepPurple[100],
};

export const APP_COLORS = {
  purple: {
    50: deepPurple[50],
    100: deepPurple[100],
    200: deepPurple[200],
    300: deepPurple[300],
    400: deepPurple[400],
    500: deepPurple[500],
    600: deepPurple[600],
    700: deepPurple[700],
    800: deepPurple[800],
    900: deepPurple[900],
  },

  status: {
    success: green[800],
    warning: amber[800],
    error: red[800],
    info: blue[700],
  },

  neutral: {
    50: grey[50],
    100: grey[100],
    200: grey[200],
    300: grey[300],
    400: grey[400],
    500: grey[500],
    600: grey[600],
    700: grey[700],
    800: grey[800],
    900: grey[900],
  },

  text: {
    primary: "#1A1A1A",
    secondary: grey[700],
    disabled: grey[500],
    hint: grey[600],
  },

  background: {
    default: deepPurple[50],
    paper: "#FFFFFF",
    light: grey[50],
    dark: grey[100],
  },

  border: {
    light: grey[300],
    main: grey[400],
    dark: grey[600],
  },

  action: {
    active: deepPurple[500],
    hover: deepPurple[100],
    selected: deepPurple[200],
    disabled: grey[400],
    disabledBackground: grey[200],
  },
};

const theme = createTheme({
  palette: {
    mode: "light",

    primary: {
      main: deepPurple[500],
      light: deepPurple[300],
      dark: deepPurple[700],
      contrastText: "#fff",
    },

    secondary: {
      main: deepPurple[200],
      light: deepPurple[100],
      dark: deepPurple[300],
      contrastText: "#1A1A1A",
    },

    success: {
      main: green[800],
      light: green[600],
      dark: green[900],
      contrastText: "#fff",
    },

    warning: {
      main: amber[800],
      light: amber[600],
      dark: amber[900],
      contrastText: "#1A1A1A",
    },

    error: {
      main: red[800],
      light: red[600],
      dark: red[900],
      contrastText: "#fff",
    },

    info: {
      main: blue[700],
      light: blue[500],
      dark: blue[900],
      contrastText: "#fff",
    },

    background: {
      default: deepPurple[50],
      paper: "#FFFFFF",
    },

    text: {
      primary: "#1A1A1A",
      secondary: grey[700],
      disabled: grey[500],
    },

    divider: grey[300],

    grey: {
      50: grey[50],
      100: grey[100],
      200: grey[200],
      300: grey[300],
      400: grey[400],
      500: grey[500],
      600: grey[600],
      700: grey[700],
      800: grey[800],
      900: grey[900],
    },
  },

  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },

  shape: {
    borderRadius: 8,
  },
});

export default theme;
