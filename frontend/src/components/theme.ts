// theme.ts
import { extendTheme, ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'dark',  // Default to dark mode
  useSystemColorMode: false, // Disable system preference
};

const theme = extendTheme({
  config,
  styles: {
    /**
     * Generates global styles based on the color mode
     * @param {object} props - The properties object containing the color mode
     * @param {string} props.colorMode - The current color mode ('dark' or 'light')
     * @returns {object} An object containing global styles for the body
     */
    global: (props: any) => ({
      body: {
        bg: props.colorMode === 'dark' ? 'gray.800' : 'white',
        color: props.colorMode === 'dark' ? 'white' : 'gray.800',
      },
    }),
  },
});

export default theme;
