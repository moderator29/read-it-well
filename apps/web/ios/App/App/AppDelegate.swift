import UIKit
import Capacitor
import UserNotifications

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Claim the notification centre delegate so the foreground
        // presentation method below is actually called. Set here, at launch,
        // because iOS only consults the delegate that was in place when the
        // notification arrives.
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    // MARK: - Push notifications
    //
    // THESE THREE METHODS ARE THE ONLY BRIDGE BETWEEN APNS AND THE PLUGIN,
    // AND WITHOUT THEM PUSH FAILS SILENTLY AND COMPLETELY.
    //
    // `PushNotifications.register()` asks iOS to register with APNs. iOS
    // answers by calling one of the first two methods below on the APP
    // DELEGATE, not on the plugin. If they are absent, the token is delivered
    // to nobody, the plugin's `registration` listener never fires, and the
    // JavaScript side waits for an event that cannot arrive. Nothing errors.
    // It is the exact shape of failure this whole feature was written to
    // refuse, and it is a missing method rather than a missing line of logic.
    //
    // `NotificationCenter` is how Capacitor's plugin receives them: it
    // observes these names and does the rest. Posting the notification is all
    // that is required here, and doing more would duplicate the plugin.
    //
    // The third method is what makes a notification VISIBLE while the
    // application is in the foreground. Without it iOS delivers the push and
    // shows nothing, which is reported as "push does not work" by every
    // person who tests it with the app open, which is everybody.

    func application(_ application: UIApplication,
                     didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications,
                                        object: deviceToken)
    }

    func application(_ application: UIApplication,
                     didFailToRegisterForRemoteNotificationsWithError error: Error) {
        // A real failure to tell the web layer about: no network, no
        // entitlement, or a provisioning profile without the Push
        // Notifications capability. The last of those is what this project
        // will hit until the owner has an Apple Developer account, and it is
        // written up in `App.entitlements`.
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications,
                                        object: error)
    }

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}

// MARK: -

extension AppDelegate: UNUserNotificationCenterDelegate {
    // SHOW IT EVEN WHEN THE APPLICATION IS OPEN.
    //
    // The iOS default is to deliver a notification to a foregrounded
    // application WITHOUT displaying anything, on the reasoning that the app
    // can show its own thing. Vallo's in-product notification row is that
    // thing and it is genuinely better, but it only appears on the pages that
    // render it, so a person reading a listing when a booking arrives would
    // see nothing at all. Banner and sound, and the badge left to the system.
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler:
                                    @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .sound, .badge])
    }

    // A TAP, WHICH IS WHERE THE DEEP LINK LIVES.
    //
    // Handed straight to Capacitor, which raises `pushNotificationActionPerformed`
    // in the web layer. The destination is carried in the payload as `href`
    // and is validated there against our own origin, for the same reason the
    // service worker validates it: a notification is a place a tap leaves the
    // application from.
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        NotificationCenter.default.post(name: Notification.Name.capacitorDidReceiveNotificationResponse,
                                        object: response)
        completionHandler()
    }
}
