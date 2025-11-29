import { useFonts } from 'expo-font';

export function useAppFonts() {
    return useFonts({
        'Poppins-Regular': require('../assets/fonts/Poppins-Regular.ttf'),
    });
}
