// Background tasks must be defined before anything else loads, including when
// Android starts the app in the background with no screen to render.
import './src/lib/location'
import 'expo-router/entry'
