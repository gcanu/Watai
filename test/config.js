module.exports = {
	connectURL: 'http://127.0.0.1:4444/wd/hub',
	
	supportPageURL: 'file:///Users/eurogiciel/Documents/Watai/test/resources/page.html',
	
	webdriverjsPath: '/Users/eurogiciel/Documents/Ghost/selenium/build/javascript/webdriver/webdriver',
	
	driverCapabilities: {
		browserName: 'chrome',
		version: '',
		platform: 'ANY',
		javascriptEnabled: true,
		firefox_binary: '/Applications/Browsers/Firefox-headless.app/Contents/MacOS/firefox',
		'chrome.binary': '/Applications/Browsers/Google Chrome.app/Contents/MacOS/Google Chrome'
	},
	
	browserWarmupTimeout: 30 * 1000	//ms
}