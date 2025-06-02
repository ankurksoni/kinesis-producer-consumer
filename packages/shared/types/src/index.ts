/**
 * @fileoverview Shared type definitions used across the Kinesis producer and consumer applications
 * 
 * This module defines common interfaces and types that are shared between different components
 * of the application, ensuring type consistency across the producer and consumer.
 */

/**
 * MessageEvent interface represents the structure of events flowing through the Kinesis stream
 * 
 * This interface defines the contract for data exchange between the producer and consumer,
 * ensuring that data conforms to the expected structure throughout the pipeline.
 * 
 * @interface MessageEvent
 * @property {string} message - The content of the message being sent through the stream
 * @property {number} time - Timestamp in milliseconds (from Date.now()) when the message was created
 */
export interface MessageEvent {
    message: string;
    time: number;
}