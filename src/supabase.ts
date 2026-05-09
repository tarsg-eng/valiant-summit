import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://dpqwinhehawxyeiqsqpp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwcXdpbmhlaGF3eHllaXFzcXBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4NDA2NTEsImV4cCI6MjA5MzQxNjY1MX0.d4AX3tzgIoNvneLS4vS3W0eGA7v5ypJPwDEmtwEvOSE',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
)
