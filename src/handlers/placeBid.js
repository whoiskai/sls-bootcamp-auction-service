
import AWS from 'aws-sdk';
import validator from '@middy/validator';
import commonMiddleware from '../lib/commonMiddleware';
import createError from 'http-errors';
import { getAuctionById } from './getAuction';
import placeBidSchema from '../lib/schemas/placeBidSchema';

const dynamodb = new AWS.DynamoDB.DocumentClient();

async function placeBid(event, context) {
  const { id } = event.pathParameters;
  const { amount } = event.body;

  const auction = await getAuctionById(id);

  if (auction.status !== 'OPEN') {
    throw new createError.Forbidden(`You cannot bid on closed auctions!`);
  }

  if (amount <= auction.highestBid.amount) {
    throw new createError.Forbidden(`Your bid must be higher than ${auction.highestBid.amount}`);
  }

  const params = {
    TableName: process.env.AUCTIONS_TABLE_NAME,
    Key: { id },
    UpdateExpression: 'set highestBid.amount = :amount',
    ExpressionAttributeValues: {
      ':amount': amount,
    },
    ReturnValues: 'ALL_NEW',
  };

  let updatedAuction;

  try {
    const result = await dynamodb.update(params).promise();
    updatedAuction = result.Attributes;
  } catch (error) {
    console.error(error);
    throw new createError.InternalServerError(error);
  }

  if (!updatedAuction) {
    throw new createError.NotFound(`Auction with ID "${id} not found!`);
  }

  return {
    statusCode: 200,
    body: JSON.stringify(updatedAuction),
  };
}

/**
 * httpJsonBodyParser auto parse stringify event body
 * httpEventNormalizer auto adjust api gateway event object for non-existent objects (reduce room for errors)
 * httpErrorHandler easier error handling
 */
export const handler = commonMiddleware(placeBid)
  .use(validator({
    inputSchema: placeBidSchema,
    ajvOptions: {
      useDefaults: true,
      strict: false,
    },
  }));


