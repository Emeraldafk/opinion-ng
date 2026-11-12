/**
 * Vite Dev Server API Plugin for OpinionNG
 * Hooks into Vite connect middleware to serve all Stage 2 REST endpoints.
 */

import { Plugin } from 'vite';
import { IncomingMessage, ServerResponse } from 'http';
import { globalNgnEngine, DEMO_USER_ID, MarketSide } from './engine';

function sendJson(res: ServerResponse, statusCode: number, data: any) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-user-id',
  });
  res.end(JSON.stringify(data));
}

function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', (err) => reject(err));
  });
}

export function opinionNgApiPlugin(): Plugin {
  return {
    name: 'opinion-ng-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const urlObj = new URL(req.url || '/', 'http://localhost');
        const pathname = urlObj.pathname;

        if (!pathname.startsWith('/api/')) {
          return next();
        }

        if (req.method === 'OPTIONS') {
          res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, x-user-id',
          });
          return res.end();
        }

        const userId =
          (req.headers['x-user-id'] as string) ||
          urlObj.searchParams.get('userId') ||
          DEMO_USER_ID;

        try {
          // 1. Health check
          if (pathname === '/api/health' && req.method === 'GET') {
            return sendJson(res, 200, {
              status: 'ok',
              service: 'OpinionNG NGN Engine (Stage 2)',
              timestamp: Date.now(),
            });
          }

          // 2. Full state / snapshot
          if (pathname === '/api/state' && req.method === 'GET') {
            return sendJson(res, 200, globalNgnEngine.getState());
          }

          // 3. User balance, positions, & wallet
          if (pathname === '/api/user/me' && req.method === 'GET') {
            const user = globalNgnEngine.getUser(userId) || globalNgnEngine.getUser(DEMO_USER_ID);
            const wallet = globalNgnEngine.getWallet(userId);
            const positions = globalNgnEngine.getUserPositions(userId);
            const ledger = globalNgnEngine.getUserLedger(userId);

            return sendJson(res, 200, {
              user,
              wallet,
              positions,
              recentLedger: ledger.slice(0, 20),
            });
          }

          // 4. Markets list
          if (pathname === '/api/markets' && req.method === 'GET') {
            const markets = globalNgnEngine.getAllMarkets().map((m) => {
              const prices = globalNgnEngine.calculateMarketPrices(m);
              return {
                ...m,
                prices,
              };
            });
            return sendJson(res, 200, { markets });
          }

          // 5. Quote Trade preview
          if (pathname === '/api/trades/quote' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const { marketId, side, isBuy, amount } = body;
            const quote = globalNgnEngine.quoteTrade(
              Number(marketId),
              side as MarketSide,
              Boolean(isBuy),
              Number(amount)
            );
            return sendJson(res, 200, quote);
          }

          // 6. Execute Buy Order
          if (pathname === '/api/trades/buy' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const { marketId, side, grossAmountKobo, slippagePct } = body;
            const targetUser = body.userId || userId;

            const result = await globalNgnEngine.executeBuy(
              targetUser,
              Number(marketId),
              side as MarketSide,
              Number(grossAmountKobo),
              Number(slippagePct || 5.0)
            );
            return sendJson(res, 200, result);
          }

          // 7. Execute Sell Order
          if (pathname === '/api/trades/sell' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const { marketId, side, sharesCount, slippagePct } = body;
            const targetUser = body.userId || userId;

            const result = await globalNgnEngine.executeSell(
              targetUser,
              Number(marketId),
              side as MarketSide,
              Number(sharesCount),
              Number(slippagePct || 5.0)
            );
            return sendJson(res, 200, result);
          }

          // 8. Create Market & Earn
          if (pathname === '/api/markets/create' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const targetUser = body.creatorId || userId;

            const result = await globalNgnEngine.createMarket(targetUser, {
              question: body.question,
              category: body.category,
              imageUri: body.imageUri,
              sourceHandle: body.sourceHandle,
              antiSpamOption: body.antiSpamOption || 'fee',
              seedAmountKobo: body.seedAmountKobo,
              yesCondition: body.yesCondition,
              noCondition: body.noCondition,
              evidenceSource: body.evidenceSource,
              closingTime: body.closingTime,
              resolutionDeadline: body.resolutionDeadline,
            });
            return sendJson(res, 201, result);
          }

          // 8b. Market Comments (Persist user debate across sessions)
          const commentsMatch = pathname.match(/^\/api\/markets\/(\d+)\/comments$/);
          if (commentsMatch && req.method === 'POST') {
            const marketId = parseInt(commentsMatch[1], 10);
            const body = await parseJsonBody(req);
            const comment = body.comment;
            if (!comment) {
              return sendJson(res, 400, { error: 'Comment payload is required' });
            }
            const comments = globalNgnEngine.addMarketComment(marketId, comment);
            return sendJson(res, 201, { success: true, comments });
          }

          if (commentsMatch && req.method === 'GET') {
            const marketId = parseInt(commentsMatch[1], 10);
            const comments = globalNgnEngine.getMarketComments(marketId);
            return sendJson(res, 200, { comments });
          }

          // 9. X (Twitter) Bot Mention Webhook
          if (pathname === '/api/webhooks/x-mentions' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const result = await globalNgnEngine.handleXMentionWebhook({
              tweet_id: body.tweet_id || `tweet_${Date.now()}`,
              author_id: body.author_id || `x_user_${Date.now()}`,
              author_username: body.author_username || 'OpinionCurator',
              text: body.text || '@OpinionNG Will this prediction pass verification?',
            });
            return sendJson(res, 200, result);
          }

          // 10. Claim Creator Earnings
          if (pathname === '/api/creator/claim' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const targetUser = body.userId || userId;

            const result = await globalNgnEngine.claimCreatorEarnings(targetUser);
            return sendJson(res, 200, result);
          }

          // 10b. Fiat Deposit (Virtual Bank Transfer / Paystack)
          if (pathname === '/api/wallet/deposit' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const targetUser = body.userId || userId;
            const amountKobo = Number(body.amountKobo);

            const result = await globalNgnEngine.executeDeposit(
              targetUser,
              amountKobo,
              body.channel || 'BANK_TRANSFER',
              body.referenceId
            );
            return sendJson(res, 200, result);
          }

          // 10c. Fiat Withdrawal to Nigerian Bank (NIP)
          if (pathname === '/api/wallet/withdraw' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const targetUser = body.userId || userId;
            const amountKobo = Number(body.amountKobo);

            const result = await globalNgnEngine.executeWithdrawal(targetUser, amountKobo, {
              bankCode: body.bankCode || '058',
              bankName: body.bankName || 'Guaranty Trust Bank',
              accountNumber: body.accountNumber || '0123456789',
              accountName: body.accountName || 'Beneficiary Account',
            });
            return sendJson(res, 200, result);
          }

          // 11. Resolve Market with 2-Hour Dispute Window
          const resolveMatch = pathname.match(/^\/api\/markets\/(\d+)\/resolve$/);
          if (resolveMatch && req.method === 'POST') {
            const marketId = Number(resolveMatch[1]);
            const body = await parseJsonBody(req);

            const result = await globalNgnEngine.resolveMarket(
              marketId,
              body.outcome,
              body.evidenceUrl || '',
              body.adminUserId || userId,
              Boolean(body.immediate)
            );
            return sendJson(res, 200, result);
          }

          // 12. Settle Market & Payouts (₦100 per winning share)
          const settleMatch = pathname.match(/^\/api\/markets\/(\d+)\/settle$/);
          if (settleMatch && req.method === 'POST') {
            const marketId = Number(settleMatch[1]);
            const body = await parseJsonBody(req);

            const result = await globalNgnEngine.settleMarket(
              marketId,
              Boolean(body.forceImmediate)
            );
            return sendJson(res, 200, result);
          }

          // 13. Audit Ledger Entries
          if (pathname === '/api/ledger' && req.method === 'GET') {
            const entries = globalNgnEngine.getUserLedger(userId);
            return sendJson(res, 200, { entries });
          }

          // Route not found
          return sendJson(res, 404, { error: `Endpoint not found: ${pathname}` });
        } catch (err: any) {
          console.error(`[API Error] ${pathname}:`, err);
          return sendJson(res, 400, {
            error: err.message || 'Internal Server Error',
          });
        }
      });
    },
  };
}

