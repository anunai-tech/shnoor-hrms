import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const PlanContext = createContext(null)

export function PlanProvider({ children, endpoint }) {
  const [features, setFeatures] = useState(null)
  const [planName, setPlanName] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!endpoint) { setLoading(false); return }
    api.get(endpoint)
      .then(r => {
        if (r.data.success) {
          setFeatures(r.data.data.features)
          setPlanName(r.data.data.plan_name)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [endpoint])

  return (
    <PlanContext.Provider value={{ features, planName, loading }}>
      {children}
    </PlanContext.Provider>
  )
}

export const usePlan = () => useContext(PlanContext)