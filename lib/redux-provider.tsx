'use client'

import { makeStore, type AppStore } from './store'
import { useRef } from 'react'
import { Provider } from 'react-redux'

type StoreProps = { children: React.ReactNode }

export default function ReduxProvider({ children }: StoreProps) {
  const storeRef = useRef<AppStore | null>(null)
  
  if (!storeRef.current) {
    // Create the store instance the first time this renders
    storeRef.current = makeStore()
  }

  return <Provider store={storeRef.current}>{children}</Provider>
}
