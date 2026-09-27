const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SDK_DIR = 'C:\\Users\\user\\AppData\\Local\\Android\\Sdk';
const BUILD_TOOLS_DIR = path.join(SDK_DIR, 'build-tools', '35.0.0');
const PLATFORM_JAR = path.join(SDK_DIR, 'platforms', 'android-36', 'android.jar');
const JAVA_HOME = 'C:\\Program Files\\Microsoft\\jdk-21.0.12.101-hotspot';

const AAPT2 = path.join(BUILD_TOOLS_DIR, 'aapt2.exe');
const D8 = path.join(BUILD_TOOLS_DIR, 'd8.bat');
const ZIPALIGN = path.join(BUILD_TOOLS_DIR, 'zipalign.exe');
const APKSIGNER = path.join(BUILD_TOOLS_DIR, 'apksigner.bat');
const JAVAC = path.join(JAVA_HOME, 'bin', 'javac.exe');
const KEYTOOL = path.join(JAVA_HOME, 'bin', 'keytool.exe');

const ROOT_DIR = path.resolve(__dirname, '..');
const ANDROID_PROJ = path.join(ROOT_DIR, 'android_src');
const OUTPUT_APK_DIR = path.join(ROOT_DIR, 'release');

console.log('🚀 Building Native Android APK: PNP_Scanner.apk...');

// 1. Prepare Directory Structure
const srcDir = path.join(ANDROID_PROJ, 'src', 'com', 'pnptechtraders', 'scanner');
const resDir = path.join(ANDROID_PROJ, 'res');
const mipmapDir = path.join(resDir, 'mipmap-xxhdpi');
const assetsDir = path.join(ANDROID_PROJ, 'assets');
const buildDir = path.join(ANDROID_PROJ, 'build');
const compiledResDir = path.join(buildDir, 'compiled_res');
const genDir = path.join(buildDir, 'gen');
const classesDir = path.join(buildDir, 'classes');

[srcDir, mipmapDir, assetsDir, compiledResDir, genDir, classesDir, OUTPUT_APK_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// 2. Copy App Icon
const sourceIcon = path.join(ROOT_DIR, 'valid_icon.png');
if (fs.existsSync(sourceIcon)) {
  fs.copyFileSync(sourceIcon, path.join(mipmapDir, 'ic_launcher.png'));
}

// 3. Copy Mobile Scanner Assets (100% Offline)
const scannerHtml = path.join(ROOT_DIR, 'PNP_Mobile_Scanner.html');
fs.copyFileSync(scannerHtml, path.join(assetsDir, 'index.html'));

const localQrLib = path.join(ROOT_DIR, 'public', 'html5-qrcode.min.js');
if (fs.existsSync(localQrLib)) {
  fs.copyFileSync(localQrLib, path.join(assetsDir, 'html5-qrcode.min.js'));
}

// 4. Create AndroidManifest.xml
const manifestContent = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.pnptechtraders.scanner"
    android:versionCode="1"
    android:versionName="1.0">

    <uses-sdk android:minSdkVersion="24" android:targetSdkVersion="35" />

    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.FLASHLIGHT" />

    <uses-feature android:name="android.hardware.camera" android:required="true" />
    <uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />
    <uses-feature android:name="android.hardware.camera.flash" android:required="false" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="PNP Scanner"
        android:roundIcon="@mipmap/ic_launcher"
        android:supportsRtl="true"
        android:theme="@android:style/Theme.NoTitleBar.Fullscreen"
        android:usesCleartextTraffic="true">
        <activity
            android:name="com.pnptechtraders.scanner.MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize|keyboardHidden"
            android:screenOrientation="portrait">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;

const manifestPath = path.join(ANDROID_PROJ, 'AndroidManifest.xml');
fs.writeFileSync(manifestPath, manifestContent, 'utf-8');

// 5. Create MainActivity.java
const mainActivityContent = `package com.pnptechtraders.scanner;

import android.app.Activity;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

public class MainActivity extends Activity {
    private WebView webView;
    private static final int CAMERA_PERMISSION_CODE = 101;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setDatabaseEnabled(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        request.grant(request.getResources());
                    }
                });
            }
        });

        // Request runtime Camera permission on Android 6.0+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (checkSelfPermission(android.Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{
                    android.Manifest.permission.CAMERA,
                    android.Manifest.permission.VIBRATE
                }, CAMERA_PERMISSION_CODE);
            }
        }

        webView.loadUrl("file:///android_asset/index.html");
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == CAMERA_PERMISSION_CODE) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                webView.reload();
            } else {
                Toast.makeText(this, "Camera permission required to scan barcodes", Toast.LENGTH_LONG).show();
            }
        }
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
`;

fs.writeFileSync(path.join(srcDir, 'MainActivity.java'), mainActivityContent, 'utf-8');

// 6. Compile Resources with aapt2
console.log('📦 Compiling Android resources with AAPT2...');
execSync(`"${AAPT2}" compile --dir "${resDir}" -o "${compiledResDir}"`);

// 7. Link Resources and Generate R.java + unaligned APK
const unalignedApk = path.join(buildDir, 'app-unaligned.apk');
console.log('🔗 Linking resources and packaging APK container...');
execSync(`"${AAPT2}" link -I "${PLATFORM_JAR}" --manifest "${manifestPath}" -A "${assetsDir}" -o "${unalignedApk}" --java "${genDir}" --auto-add-overlay ${fs.readdirSync(compiledResDir).map(f => `"${path.join(compiledResDir, f)}"`).join(' ')}`);

// 8. Compile Java Source Code
console.log('☕ Compiling Java code with javac...');
const javaFiles = [
  path.join(srcDir, 'MainActivity.java'),
  path.join(genDir, 'com', 'pnptechtraders', 'scanner', 'R.java')
].map(f => `"${f}"`).join(' ');

execSync(`"${JAVAC}" -source 8 -target 8 -bootclasspath "${PLATFORM_JAR}" -d "${classesDir}" ${javaFiles}`);

// 9. Convert bytecode to Dalvik Executable (classes.dex) with D8
console.log('⚙️ Converting bytecode to Dalvik DEX with D8...');
const classPkgDir = path.join(classesDir, 'com', 'pnptechtraders', 'scanner');
const classFiles = fs.readdirSync(classPkgDir)
  .filter(f => f.endsWith('.class'))
  .map(f => `"${path.join(classPkgDir, f)}"`)
  .join(' ');

execSync(`"${D8}" --release --min-api 24 --output "${buildDir}" ${classFiles}`, {
  env: { ...process.env, JAVA_HOME }
});

// 10. Add classes.dex into unaligned APK using zip command or Node archiver/jar
console.log('📦 Adding classes.dex into APK...');
const JAR_TOOL = path.join(JAVA_HOME, 'bin', 'jar.exe');
execSync(`"${JAR_TOOL}" -uf "${unalignedApk}" -C "${buildDir}" classes.dex`);

// 11. Zipalign the APK
console.log('📐 Aligning APK with zipalign...');
const alignedApk = path.join(buildDir, 'app-aligned.apk');
if (fs.existsSync(alignedApk)) fs.unlinkSync(alignedApk);
execSync(`"${ZIPALIGN}" -v -p 4 "${unalignedApk}" "${alignedApk}"`);

// 12. Create Keystore if not exists
const keystorePath = path.join(ANDROID_PROJ, 'debug.keystore');
if (!fs.existsSync(keystorePath)) {
  console.log('🔑 Generating debug keystore...');
  execSync(`"${KEYTOOL}" -genkey -v -keystore "${keystorePath}" -alias androiddebugkey -storepass android -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=PNPTechTraders,O=PNP,C=NP"`);
}

// 13. Sign the APK with apksigner
const finalApkPath = path.join(OUTPUT_APK_DIR, 'PNP_Scanner.apk');
console.log('✍️ Signing APK with apksigner...');
execSync(`"${APKSIGNER}" sign --ks "${keystorePath}" --ks-pass pass:android --ks-key-alias androiddebugkey --key-pass pass:android --out "${finalApkPath}" "${alignedApk}"`, {
  env: { ...process.env, JAVA_HOME }
});

// 14. Copy to Root Directory & Client folders for easy access
fs.copyFileSync(finalApkPath, path.join(ROOT_DIR, 'PNP_Scanner.apk'));
const clientFolder = path.join(ROOT_DIR, 'exe file for client');
if (fs.existsSync(clientFolder)) {
  fs.copyFileSync(finalApkPath, path.join(clientFolder, 'PNP_Scanner.apk'));
}

console.log('\n======================================================');
console.log('🎉 Android APK Successfully Built & Signed!');
console.log(`📱 APK Path: ${finalApkPath}`);
console.log(`📁 Also copied to: ${path.join(ROOT_DIR, 'PNP_Scanner.apk')}`);
console.log('======================================================\n');
