import { MantineProvider } from '@mantine/core';
import './App.css'
import '@mantine/core/styles.css';
import { HeroText } from './herotext';

function App() {

  return (
    <MantineProvider defaultColorScheme="dark">
      <HeroText/>
    </MantineProvider>
  )
}

export default App
