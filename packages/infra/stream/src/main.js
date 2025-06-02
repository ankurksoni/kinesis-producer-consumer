"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var aws_cdk_lib_1 = require("aws-cdk-lib");
var kinesis = require("aws-cdk-lib/aws-kinesis");
var ssm = require("aws-cdk-lib/aws-ssm");
var StreamStack = /** @class */ (function (_super) {
    __extends(StreamStack, _super);
    function StreamStack(scope, id, props) {
        var _this = _super.call(this, scope, id, props) || this;
        var stream = new kinesis.Stream(_this, 'KinesisStream', {
            streamName: 'MyStream',
            shardCount: 1,
        });
        new ssm.StringParameter(_this, 'StreamName', {
            parameterName: '/streams/my-stream/name',
            stringValue: stream.streamName,
        });
        new ssm.StringParameter(_this, 'StreamArn', {
            parameterName: '/streams/my-stream/arn',
            stringValue: stream.streamArn,
        });
        return _this;
    }
    return StreamStack;
}(aws_cdk_lib_1.Stack));
var app = new aws_cdk_lib_1.App();
new StreamStack(app, 'StreamStack');
