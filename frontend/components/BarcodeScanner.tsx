import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
} from "react-native";
import { CameraView, useCameraPermissions, BarcodeScanningResult } from "expo-camera";

interface BarcodeScannerProps {
    visible: boolean;
    onClose: () => void;
    onScan: (barcode: string) => void;
}

export default function BarcodeScanner({ visible, onClose, onScan }: BarcodeScannerProps) {
    const [permission, requestPermission] = useCameraPermissions();

    const handleBarCodeScanned = ({ data }: BarcodeScanningResult) => {
        onScan(data);
        onClose();
    };

    if (!permission?.granted) {
        return (
            <Modal visible={visible} animationType="slide">
                <View style={styles.permissionContainer}>
                    <Text style={styles.permissionText}>
                        Camera permission required
                    </Text>
                    <TouchableOpacity style={styles.button} onPress={requestPermission}>
                        <Text style={styles.buttonText}>Grant Permission</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        );
    }

    return (
        <Modal visible={visible} animationType="slide">
            <View style={styles.container}>
                <CameraView
                    style={styles.camera}
                    facing="back"
                    barcodeScannerSettings={{
                        barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39"],
                    }}
                    onBarcodeScanned={handleBarCodeScanned}
                >
                    {/* darker background */}
                    <View style={styles.overlay}>
                        <View style={styles.overlayTop} />
                        <View style={styles.overlayMiddle}>
                            <View style={styles.overlaySide} />
                            <View style={styles.scanArea}>
                            </View>
                            <View style={styles.overlaySide} />
                        </View>
                        <View style={styles.overlayBottom} />
                    </View>
                </CameraView>

                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                    <Text style={styles.closeButtonText}>✕ Close</Text>
                </TouchableOpacity>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "black",
    },
    camera: {
        flex: 1,
    },
    overlay: {
        flex: 1,
    },
    overlayTop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.7)",
    },
    overlayMiddle: {
        flexDirection: "row",
        height: 200,
    },
    overlaySide: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.7)",
    },
    overlayBottom: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.7)",
    },
    scanArea: {
        width: 300,
        height: 200,
        position: "relative",
    },
    closeButton: {
        position: "absolute",
        top: 50,
        right: 20,
        backgroundColor: "rgba(255,255,255,0.3)",
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    closeButtonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "600",
    },
    permissionContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
        backgroundColor: "white",
    },
    permissionText: {
        fontSize: 16,
        textAlign: "center",
        marginBottom: 20,
    },
    button: {
        backgroundColor: "#007AFF",
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 8,
        marginBottom: 10,
    },
    buttonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "600",
    },
    cancelButton: {
        paddingHorizontal: 30,
        paddingVertical: 15,
    },
    cancelButtonText: {
        color: "#007AFF",
        fontSize: 16,
    },
});
