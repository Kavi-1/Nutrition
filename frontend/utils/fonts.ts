import { useFonts } from 'expo-font';

export function useAppFonts() {
    return useFonts({
        'Poppins-Regular': require('../assets/fonts/Poppins-Regular.ttf'),
        'Poppins-Bold': require('../assets/fonts/Poppins-SemiBold.ttf'),
    });
}
