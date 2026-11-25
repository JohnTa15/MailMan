package com.mailman.app;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Arrays;

/**
 * Built-in updates for the Android app: downloads a Mailman release APK,
 * checks it is signed with the same key as the installed app, and opens
 * Android's installer for it. Android asks the person to confirm.
 */
@CapacitorPlugin(name = "AppUpdate")
public class AppUpdatePlugin extends Plugin {

    /** Only Mailman's own GitHub releases are downloaded and installed. */
    private static final String RELEASES = "https://github.com/JohnTa15/MailMan/releases/download/";

    @PluginMethod
    public void install(PluginCall call) {
        String url = call.getString("url");
        if (url == null || !url.startsWith(RELEASES) || !url.endsWith(".apk")) {
            call.reject("Not a Mailman release", "BAD_URL");
            return;
        }
        // Android 8+: the person allows Mailman to install apps, once
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !getContext().getPackageManager().canRequestPackageInstalls()) {
            Intent settings = new Intent(
                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:" + getContext().getPackageName())
            );
            settings.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(settings);
            call.reject("Allow Mailman to install updates, then try again", "PERMISSION_NEEDED");
            return;
        }
        new Thread(() -> {
            try {
                File apk = download(url);
                if (!sameSigner(apk)) {
                    call.reject("This version is signed differently. Uninstall Mailman and install it once by hand.", "SIGNATURE_MISMATCH");
                    return;
                }
                Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", apk);
                Intent install = new Intent(Intent.ACTION_VIEW);
                install.setDataAndType(uri, "application/vnd.android.package-archive");
                install.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(install);
                call.resolve();
            } catch (Exception e) {
                call.reject("Download failed: " + e.getMessage(), "DOWNLOAD_FAILED");
            }
        }).start();
    }

    private File download(String address) throws IOException {
        File dir = new File(getContext().getCacheDir(), "updates");
        if (!dir.exists() && !dir.mkdirs()) throw new IOException("no cache folder");
        File apk = new File(dir, "mailman-update.apk");

        // GitHub redirects release downloads to its file host (https to https)
        HttpURLConnection conn = (HttpURLConnection) new URL(address).openConnection();
        conn.setInstanceFollowRedirects(true);
        conn.setConnectTimeout(20000);
        conn.setReadTimeout(30000);
        int code = conn.getResponseCode();
        if (code != HttpURLConnection.HTTP_OK) throw new IOException("HTTP " + code);
        long total = conn.getContentLengthLong();
        try (InputStream in = conn.getInputStream(); OutputStream out = new FileOutputStream(apk)) {
            byte[] buffer = new byte[64 * 1024];
            long done = 0;
            int lastPercent = -1;
            int n;
            while ((n = in.read(buffer)) > 0) {
                out.write(buffer, 0, n);
                done += n;
                if (total > 0) {
                    int percent = (int) (done * 100 / total);
                    if (percent != lastPercent) {
                        lastPercent = percent;
                        JSObject event = new JSObject();
                        event.put("percent", percent);
                        notifyListeners("progress", event);
                    }
                }
            }
        } finally {
            conn.disconnect();
        }
        return apk;
    }

    /** Android refuses an update signed by another key; say so before opening the installer. */
    @SuppressWarnings("deprecation")
    private boolean sameSigner(File apk) {
        PackageManager pm = getContext().getPackageManager();
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                PackageInfo update = pm.getPackageArchiveInfo(apk.getPath(), PackageManager.GET_SIGNING_CERTIFICATES);
                PackageInfo installed = pm.getPackageInfo(getContext().getPackageName(), PackageManager.GET_SIGNING_CERTIFICATES);
                if (update == null || update.signingInfo == null || installed.signingInfo == null) return false;
                Signature[] a = update.signingInfo.getApkContentsSigners();
                Signature[] b = installed.signingInfo.getApkContentsSigners();
                return Arrays.equals(a, b);
            }
            PackageInfo update = pm.getPackageArchiveInfo(apk.getPath(), PackageManager.GET_SIGNATURES);
            PackageInfo installed = pm.getPackageInfo(getContext().getPackageName(), PackageManager.GET_SIGNATURES);
            return update != null && Arrays.equals(update.signatures, installed.signatures);
        } catch (Exception e) {
            return false;
        }
    }
}
