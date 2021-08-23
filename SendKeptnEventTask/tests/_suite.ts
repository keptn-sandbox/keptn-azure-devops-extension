import * as path from 'path';
import * as assert from 'assert';
import * as ttm from 'azure-pipelines-task-lib/mock-test';

describe('Send Keptn Event task tests', function () {

    before( function() {

    });

    after(() => {

    });

    it('should succeed with good input', function(done: Mocha.Done) {
	    let tp = path.join(__dirname, 'goodinput.js');
	    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);
	
	    tr.run();
		console.log(tr.succeeded);
		console.log(tr.stdout);
		console.log(tr.stderr);
		
	    assert.strictEqual(tr.succeeded, true, 'should have succeeded');
	    assert.strictEqual(tr.warningIssues.length, 0, "should have no warnings");
	    assert.strictEqual(tr.errorIssues.length, 0, "should have no errors");
		assert.strictEqual(tr.stdout.indexOf('keptnApiEndpoint https://api.keptn.mock') >= 0, true, "should display keptnApiEndpoint");
		assert.strictEqual(tr.stdout.indexOf('sending') >= 0, false, "should not be sending");
		
	    done();
	});
	
	it('must send out start-evaluation', function(done: Mocha.Done) {
		this.timeout(10000);

		let tp = path.join(__dirname, 'sendstartevaluation.js');
	    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);
	
		tr.run();
		
		console.log(tr.succeeded);
		console.log(tr.stdout);
		console.log(tr.stderr);

	    assert.strictEqual(tr.succeeded, true, 'should have succeeded');
	    assert.strictEqual(tr.errorIssues.length, 0, "should have no errors");
		assert.strictEqual(tr.stdout.indexOf('keptnApiEndpoint') >= 0, true, "should display keptnApiEndpoint");
		assert.strictEqual(tr.stdout.indexOf('sending') >= 0, true, "should be sending an event");
		
	    done();
	});

	it('must send out deployment-finished', function(done: Mocha.Done) {
		this.timeout(10000);

		let tp = path.join(__dirname, 'senddeploymentfinished.js');
	    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);
	
		tr.run();
		
		console.log(tr.succeeded);
		console.log(tr.stdout);
		console.log(tr.stderr);

	    assert.strictEqual(tr.succeeded, true, 'should have succeeded');
	    assert.strictEqual(tr.errorIssues.length, 0, "should have no errors");
		assert.strictEqual(tr.stdout.indexOf('keptnApiEndpoint') >= 0, true, "should display keptnApiEndpoint");
		assert.strictEqual(tr.stdout.indexOf('sending') >= 0, true, "should be sending an event");
		
	    done();
	});

	it('must send out configuration-changed', function(done: Mocha.Done) {
		this.timeout(10000);

		let tp = path.join(__dirname, 'sendconfigurationchanged.js');
	    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);
	
		tr.run();
		
		console.log(tr.succeeded);
		console.log(tr.stdout);
		console.log(tr.stderr);

	    assert.strictEqual(tr.succeeded, true, 'should have succeeded');
	    assert.strictEqual(tr.errorIssues.length, 0, "should have no errors");
		assert.strictEqual(tr.stdout.indexOf('keptnApiEndpoint') >= 0, true, "should display keptnApiEndpoint");
		assert.strictEqual(tr.stdout.indexOf('sending') >= 0, true, "should be sending an event");
		
	    done();
	});

	it('must send out delivery triggered', function(done: Mocha.Done) {
		this.timeout(10000);

		let tp = path.join(__dirname, 'senddeliverytriggered.js');
	    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);
	
		tr.run();
		
		console.log(tr.succeeded);
		console.log(tr.stdout);
		console.log(tr.stderr);

	    assert.strictEqual(tr.succeeded, true, 'should have succeeded');
	    assert.strictEqual(tr.errorIssues.length, 0, "should have no errors");
		assert.strictEqual(tr.stdout.indexOf('keptnApiEndpoint') >= 0, true, "should display keptnApiEndpoint");
		assert.strictEqual(tr.stdout.indexOf('sending') >= 0, true, "should be sending an event");
		
	    done();
	});

	it('must send out generic event triggered', function(done: Mocha.Done) {
		this.timeout(10000);

		let tp = path.join(__dirname, 'sendgenerictriggered.js');
	    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);
	
		tr.run();
		
		console.log(tr.succeeded);
		console.log(tr.stdout);
		console.log(tr.stderr);

	    assert.strictEqual(tr.succeeded, true, 'should have succeeded');
	    assert.strictEqual(tr.errorIssues.length, 0, "should have no errors");
		assert.strictEqual(tr.stdout.indexOf('keptnApiEndpoint') >= 0, true, "should display keptnApiEndpoint");
		assert.strictEqual(tr.stdout.indexOf('sending') >= 0, true, "should be sending an event");
		
	    done();
	});
	
	it('should fail on bad input', function(done: Mocha.Done) {
		let tp = path.join(__dirname, 'badinput.js');
		let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

		tr.run();
		console.log(tr.succeeded);
		console.log(tr.stdout);
		assert.strictEqual(tr.succeeded, false, 'should have failed');
		assert.strictEqual(tr.warningIssues.length, 0, "should have no warnings");
		assert.strictEqual(tr.errorIssues.length, 1, "should have 1 error issue");
		assert.match(tr.errorIssues[0], new RegExp('^missing required input.*$'), 'error issue output');

		done();
	});
	
});