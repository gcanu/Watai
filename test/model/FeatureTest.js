var promises = require('q');

var TestRight = require('../helpers/subject'),
	my = require('../helpers/driver').getDriverHolder(),
	expectedOutputs = require('../helpers/testWidget').expectedOutputs,
	WidgetTest;

/** Milliseconds the actions take to delay changing the output on the test page.
* Set in the test page (`test/resources/page.html`).
*/
var DELAYED_ACTIONS_DELAY	= 500,
/** Timeout value of the test's config.
*/
	GLOBAL_TIMEOUT			= 500;	//TODO: get from configManager


/** This test suite is redacted with [Mocha](http://visionmedia.github.com/mocha/) and [Should](https://github.com/visionmedia/should.js).
*/
describe('Feature', function() {
	var featureWithScenario;

	before(function() {
		WidgetTest = require('../helpers/testWidget').getWidget(my.driver);

		featureWithScenario = function featureWithScenario(scenario) {
			return new TestRight.Feature('Test feature', scenario, { TestWidget: WidgetTest });
		}
	});


	describe('functional scenarios with', function() {
		var failureReason = 'It’s a trap!';

		var failingFeatureTest = function() {
			return featureWithScenario([
				function() { throw failureReason }
			]).test();
		}

		function makeFailingPromiseWithSuffix(suffix) {
			return function() {
				var deferred = promises.defer();
				deferred.reject(failureReason + suffix);
				return deferred.promise;
			}
		}

		var failingPromise = makeFailingPromiseWithSuffix('');


		it('an empty feature should be accepted', function(done) {
			featureWithScenario([]).test().then(done, function() {
				done(new Error(arguments));
			}).end();
		});

		it('a failing function should be rejected', function(done) {
			failingFeatureTest().then(function() {
					done(new Error('Resolved instead of rejected!'));
				}, function() {
					done();	// can't pass it directly, Mocha complains about param not being an error…
				}
			).end();
		});

		it('an error should be rejected and reasons passed', function(done) {
			failingFeatureTest().then(function() {
					done(new Error('Resolved instead of rejected!'));
				}, function(reasons) {
					reasons.errors.should.have.length(0);
					reasons.failures.should.have.length(1);
					reasons.failures[0].should.match(new RegExp(failureReason));
					done();
				}
			).end();
		});

		it('a failing promise should be rejected and reasons passed', function(done) {
			featureWithScenario([
				failingPromise
			]).test().then(function() {
					done(new Error('Resolved instead of rejected!'));
				}, function(reasons) {	// second callback is the error callback, that's the one we're testing a call for
					reasons.errors.should.have.length(0);
					reasons.failures.should.have.length(1);
					reasons.failures[0].should.match(new RegExp(failureReason));
					done();
				}
			).end();
		});

		it('multiple failing promises should be rejected and reasons passed in correct order', function(done) {
			featureWithScenario([
				makeFailingPromiseWithSuffix(0),
				makeFailingPromiseWithSuffix(1),
				makeFailingPromiseWithSuffix(2)
			]).test().then(function() {
					done(new Error('Resolved instead of rejected!'));
				}, function(reasons) {
					try {
						reasons.failures.should.have.length(3);
						reasons.failures[0].should.match(new RegExp(failureReason + '0'));
						reasons.failures[1].should.match(new RegExp(failureReason + '1'));
						reasons.failures[2].should.match(new RegExp(failureReason + '2'));
						reasons.errors.should.have.length(0);
						done();
					} catch (err) {
						done(err);
					}
				}
			).end();
		});

		it('pure functions should be made into promises', function(done) {
			var called = false;

			featureWithScenario([ function() {
				called = true;
			} ]).test().then(function() {
				if (called)
					done();
				else
					done(new Error('Promise resolved without actually calling the scenario function'));
			}, function() {
				done(new Error('Feature evaluation failed, with' + (called ? '' : 'out')
								+ ' actually calling the scenario function (but that’s still an error)'));
			}).end();
		});

		it('parameters should be bound to previous functions', function(done) {
			var called = false;

			featureWithScenario([
				function(first, second) {
					called = first + second;
				},
				'to', 'ti'	// if this test case works, the function above should set the `called` marker to the concatenation of these strings
			]).test().then(function() {
				if (called == 'toti')
					done();
				else
					done(new Error('Promise resolved without actually calling the scenario function'));
			}, function(err) {
				done(new Error('Promise rejected with' + (called ? '' : 'out')
								+ ' actually calling the scenario function (but that’s still an error)'));
			}).end();
		});
	});


	describe('scenarios with widget states descriptions', function() {
		var expectedContents = {},
			wrongTexts    = {},
			firstKey;	// the first key of expected texts. Yes, it is used in a test.

		before(function() {
			Object.each(require('../helpers/testWidget').expectedContents, function(text, key) {	// we need to namespace all attributes to TestWidget
				expectedContents['TestWidget.' + key] = text;
				wrongTexts['TestWidget.' + key] = text + ' **modified**';

				if (! firstKey)
					firstKey = 'TestWidget.' + key;
			});
		});


		it('should be made into promises', function() {
			var result = featureWithScenario([]).buildAssertionPromise(expectedContents);	// weird construct, but that's just whitebox testing, necessarily made on an instance
			result.should.be.a('function');
			promises.isPromise(result()).should.be.ok;
		});

		it('should be parsed within a scenario', function() {
			var directCall = featureWithScenario([]).buildAssertionPromise(expectedContents);	// weird construct, but that's just whitebox testing, necessarily made on an instance
			var featureFromScenario = featureWithScenario([ expectedContents ]);

			featureFromScenario.should.have.property('steps').with.lengthOf(1);
			String(featureFromScenario.steps[0]).should.equal(String(directCall));
		});

		it('that are empty should pass', function(done) {
			featureWithScenario([
				{}
			]).test().then(done, function(err) {
				should.fail('Should have passed (reason: "' + err + ')');
				done();
			})
		});

		it('that fail should be rejected and reasons passed', function(done) {
			featureWithScenario([
				wrongTexts
			]).test().then(function() {
				done(new Error('Unmatched widget state description should not be resolved.'));
			}, function(reasons) {
				var firstReason = reasons.failures[0];
				if (firstReason
					&& firstReason.contains(firstKey)
					&& firstReason.contains(wrongTexts[firstKey])
					&& firstReason.contains(expectedContents[firstKey])) {
					done();
				} else {
					done(new Error('Unmatched widget state description was properly rejected, but the reason for rejection was not clear enough (got "' + firstReason + '").'));
				}
			}).end();
		});

		it('that are incorrectly written should throw an error upon creation', function() {
			(function() {
				featureWithScenario([
					{ toto: 'toto'}	// no widget matches this property path. We have to protect users against misspelled paths.
				]);
			}).should.throw();
		});

		/* We cannot decide in advance whether a given identifier will match in another page or not. The only thing we can check is whether we're trying to describe an unknown widget property.
		*/
		it('that are not accessible on the current page but properly written should not throw an error', function() {
			(function() {
				featureWithScenario([
					{ 'TestWidget.missing': 'missing'}
				]);
			}).should.not.throw();
		});
	});


	describe('badly-formatted scenarios', function() {
		it('with null should throw', function() {
			(function() {
				featureWithScenario([
					null
				]);
			}).should.throw(/at step 1/);
		});

		it('with explicit undefined should throw', function() {
			(function() {
				featureWithScenario([
					undefined
				]);
			}).should.throw(/at step 1/);
		});

		it('with undefined reference should throw', function() {
			var a;

			(function() {
				featureWithScenario([
					a
				]);
			}).should.throw(/at step 1/);
		});

		it('with a bad number of parameters given to a function should throw', function() {
			(function() {
				featureWithScenario([
					function(a) {}	// this function expects a parameter
				]);
			}).should.throw(/at step 1/);
		});

		it('with a bad number of parameters given to a named function should throw and name the offender', function() {
			(function() {
				featureWithScenario([
					function thatFails(a) {}	// this function expects a parameter
				]);
			}).should.throw(/thatFails/);
		});
	});


	describe('state descriptions option', function() {
		describe('timeout', function() {
			it('should be allowed without any harm', function(done) {
				featureWithScenario([
					WidgetTest.immediateAction,
					{ timeout: 0 }
				]).test().then(done, done);
			});

			it('should do immediate evaluation if set to 0', function(done) {
				featureWithScenario([
					WidgetTest.immediateAction,	// make sure the content of the output is reset
					WidgetTest.delayedAction,
					{
						timeout: 0,
						'TestWidget.output': expectedOutputs.immediateAction
					}
				]).test().then(function() {
					done(new Error('Matched while the expected result should have been set later than evaluation.'))
				}, function() {
					done();
				});
			});

			it('should do delayed evaluation if set to a proper positive value', function(done) {
				featureWithScenario([
					WidgetTest.immediateAction,	// make sure the content of the output is reset
					WidgetTest.delayedAction,
					{
						timeout: DELAYED_ACTIONS_DELAY * 2,
						'TestWidget.output': expectedOutputs.delayedActionLink
					}
				]).test().then(done, function(report) {
					var message = "No failure report. See code";

					if (report && report.failures && report.failures[0])
						message = report.failures[0];

					done(new Error(message));
				});
			});

			it('should not be longer than needed if set to a positive value', function(done) {
				this.timeout(DELAYED_ACTIONS_DELAY * 3);

				featureWithScenario([
					WidgetTest.immediateAction,	// make sure the content of the output is reset
					WidgetTest.otherDelayedAction,
					{
						timeout: DELAYED_ACTIONS_DELAY * 2,
						'TestWidget.output': expectedOutputs.otherDelayedActionLink
					}
				]).test().then(done, function(report) {
					var message = "No failure report. See code";

					if (report && report.failures && report.failures[0])
						message = report.failures[0];

					done(new Error(message));
				});
			});

			it('should detect changes and fail earlier than maximum if there was a change', function(done) {
				this.timeout(DELAYED_ACTIONS_DELAY * 3);

				featureWithScenario([
					WidgetTest.immediateAction,	// make sure the content of the output is reset
					WidgetTest.delayedAction,
					{
						timeout: DELAYED_ACTIONS_DELAY * 2,
						'TestWidget.output': expectedOutputs.otherDelayedActionLink
					}
				]).test().then(function() {
					done(new Error('Matched while the expected result should have been set later than evaluation.'))
				}, function() {
					done();
				});
			});

			it('should fail if expected state comes later than timeout', function(done) {
				this.timeout(DELAYED_ACTIONS_DELAY * 2);

				featureWithScenario([
					WidgetTest.immediateAction,	// make sure the content of the output is reset
					WidgetTest.otherDelayedAction,
					{
						timeout: DELAYED_ACTIONS_DELAY / 10,
						'TestWidget.output': expectedOutputs.otherDelayedActionLink
					}
				]).test().then(function() {
					done(new Error('Matched while the expected result should have been set later than evaluation.'))
				}, function(err) {
					done();
				});
			});

			it('should fail if expected state comes later than timeout and timeout is set to 0', function(done) {
				this.timeout(DELAYED_ACTIONS_DELAY * 2);

				featureWithScenario([
					WidgetTest.immediateAction,	// make sure the content of the output is reset
					WidgetTest.delayedAction,
					{
						timeout: 0,
						'TestWidget.output': expectedOutputs.delayedActionLink
					}
				]).test().then(function() {
					done(new Error('Matched while the expected result should have been set later than evaluation.'))
				}, function() {
					done();
				});
			});
		});
	});


	describe('unclickable elements', function() {
		it('should respect the global timeout', function(done) {
			var start = new Date();

			featureWithScenario([
				WidgetTest.overlayedAction,
				{
					'TestWidget.output': expectedOutputs.overlayedActionLink
				}
			]).test().then(function() {
				done(new Error('Passed while the overlayed element should not have been clickable!'))
			}, function() {
				var waitedMs = new Date() - start;
				if (waitedMs >= GLOBAL_TIMEOUT)
					done();
				else
					done(new Error('Waited only ' + waitedMs + ' ms instead of at least ' + GLOBAL_TIMEOUT + ' ms.'))
			}).end();
		});

		it('should be fine if made clickable', function(done) {
			featureWithScenario([
				WidgetTest.hideOverlay,
				WidgetTest.overlayedAction,
				{
					'TestWidget.output': expectedOutputs.overlayedActionLink
				}
			]).test().then(done, function(report) {
				var message = "No failure report. See code";

				if (report && report.failures && report.failures[0])
					message = report.failures[0];

				done(new Error(message));
			}).end();
		});
	});


	describe('missing elements', function() {
		it('should fail', function(done) {
			featureWithScenario([
				{ 'TestWidget.missing': 'toto' }
			]).test().then(function() {
					done(new Error('Resolved instead of rejected!'));
				}, function(reasons) {
					reasons.errors.should.have.length(0);
					reasons.failures.should.have.length(1);
					done();
				}
			).end();
		});
	});
});
