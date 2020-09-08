import * as path from 'path';
import * as assert from 'assert';
import * as ttm from 'azure-pipelines-task-lib/mock-test';

describe('Send Keptn Event task tests', function () {

    before( function() {

    });

    after(() => {

    });

    it('should succeed with good input', function(done: MochaDone) {
	    let tp = path.join(__dirname, 'goodinput.js');
	    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);
	
	    tr.run();
		console.log(tr.succeeded);
		console.log(tr.stdout);
		console.log(tr.stderr);
		
	    assert.equal(tr.succeeded, true, 'should have succeeded');
	    assert.equal(tr.warningIssues.length, 0, "should have no warnings");
	    assert.equal(tr.errorIssues.length, 0, "should have no errors");
		assert.equal(tr.stdout.indexOf('keptnApiEndpoint https://api.keptn.mock') >= 0, true, "should display keptnApiEndpoint");
		assert.equal(tr.stdout.indexOf('sending') >= 0, false, "should not be sending");
		
	    done();
	});
	
	it('must send out startevaluation', function(done: MochaDone) {
		this.timeout(10000);

		let tp = path.join(__dirname, 'sendstartevaluation.js');
	    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);
	
		tr.run();
		
		console.log(tr.succeeded);
		console.log(tr.stdout);
		console.log(tr.stderr);

	    assert.equal(tr.succeeded, true, 'should have succeeded');
	    assert.equal(tr.errorIssues.length, 0, "should have no errors");
		assert.equal(tr.stdout.indexOf('keptnApiEndpoint') >= 0, true, "should display keptnApiEndpoint");
		assert.equal(tr.stdout.indexOf('sending') >= 0, true, "should be sending an event");
		
	    done();
	});

	it('must send out deploymentfinished', function(done: MochaDone) {
		this.timeout(10000);

		let tp = path.join(__dirname, 'senddeploymentfinished.js');
	    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);
	
		tr.run();
		
		console.log(tr.succeeded);
		console.log(tr.stdout);
		console.log(tr.stderr);

	    assert.equal(tr.succeeded, true, 'should have succeeded');
	    assert.equal(tr.errorIssues.length, 0, "should have no errors");
		assert.equal(tr.stdout.indexOf('keptnApiEndpoint') >= 0, true, "should display keptnApiEndpoint");
		assert.equal(tr.stdout.indexOf('sending') >= 0, true, "should be sending an event");
		
	    done();
	});
	
	it('should fail on bad input', function(done: MochaDone) {
		let tp = path.join(__dirname, 'badinput.js');
		let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

		tr.run();
		console.log(tr.succeeded);
		console.log(tr.stdout);
		assert.equal(tr.succeeded, false, 'should have failed');
		assert.equal(tr.warningIssues, 0, "should have no warnings");
		assert.equal(tr.errorIssues.length, 1, "should have 1 error issue");
		assert.match(tr.errorIssues[0], new RegExp('^missing required input.*$'), 'error issue output');

		done();
    });    
});