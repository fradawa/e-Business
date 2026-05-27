// Fichier de configuration contenant les variables d'environnement
// ATTENTION : Ce fichier étant lu par le navigateur (Frontend), ces clés restent visibles
// pour un utilisateur averti. La vraie sécurité vient des "Firebase Security Rules".

export const ENV = {
    // Configuration Firebase
    FIREBASE_API_KEY: "AIzaSyCjRqYgjH-wz-jiifP2DSacA1jGPTfVVS0",
    FIREBASE_AUTH_DOMAIN: "thiaflow-a8c10.firebaseapp.com",
    FIREBASE_PROJECT_ID: "thiaflow-a8c10",
    FIREBASE_STORAGE_BUCKET: "thiaflow-a8c10.firebasestorage.app",
    FIREBASE_MESSAGING_SENDER_ID: "806479541370",
    FIREBASE_APP_ID: "1:806479541370:web:a081f2f023dd03443b77c3",
    FIREBASE_MEASUREMENT_ID: "G-5CX2E8GG0P",

    // Configuration Cloudinary
    CLOUDINARY_CLOUD_NAME: "dfbqhoqsq",
    CLOUDINARY_UPLOAD_PRESET: "boutique_images",

    // Whitelist des emails autorisés à accéder au panel admin
    // Ajoute ici tous les emails qui doivent avoir accès
    ADMIN_EMAILS: [
        "sambouezechiel837@gmail.com",
        "fadilouseck9@gmail.com"
    ]
};
