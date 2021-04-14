import { v4 as uuid } from 'uuid';
import AWS from 'aws-sdk';
import validator from '@middy/validator';
import commonMiddleware from '../lib/commonMiddleware';
import createAuctionSchema from '../lib/schemas/createAuctionSchema';
import createError from 'http-errors';

const dynamodb = new AWS.DynamoDB.DocumentClient();

async function createAuction(event, context) {
  const { title } = event.body;
  const now = new Date();
  const endDate = new Date();
  endDate.setHours(now.getHours() + 1);

  const auction = {
    id: uuid(),
    title,
    status: 'OPEN',
    createdAt: now.toISOString(),
    endingAt: endDate.toISOString(),
    highestBid: {
      amount: 0,
    },
  };

  try {
    await dynamodb.put({
      TableName: process.env.AUCTIONS_TABLE_NAME,
      Item: auction,
    }).promise();
  } catch (error) {
    console.error(error);
    throw new createError.InternalServerError(error);
  }

  return {
    statusCode: 201,
    body: JSON.stringify(auction),
  };
}

/**
 * httpJsonBodyParser auto parse stringify event body
 * httpEventNormalizer auto adjust api gateway event object for non-existent objects (reduce room for errors)
 * httpErrorHandler easier error handling
 */
export const handler = commonMiddleware(createAuction)
  .use(validator({
    inputSchema: createAuctionSchema,
    ajvOptions: {
      useDefaults: true,
      strict: false,
    },
  }));


