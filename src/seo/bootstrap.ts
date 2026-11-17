import { legacyDestination } from '../services/personLinks'

if (process.env.TARO_ENV === 'h5') {
  const migrate = () => {
    const destination = legacyDestination(window.location.hash)
    if (destination) window.location.replace(destination)
  }
  migrate()
  window.addEventListener('hashchange', migrate)
}
