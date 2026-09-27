const { WebSocket } = require('ws');

async function testWebSocketFlow() {
  console.log('Testing WebSocket Relay on ws://localhost:8090...');

  const desktopWs = new WebSocket('ws://localhost:8090?type=desktop&name=TestDesktop');
  const mobileWs = new WebSocket('ws://localhost:8090?type=mobile&device=TestMobile');

  let desktopReceived = false;
  let mobileAckReceived = false;

  await new Promise((resolve) => {
    let openCount = 0;
    const checkOpen = () => {
      openCount++;
      if (openCount === 2) resolve();
    };
    desktopWs.on('open', checkOpen);
    mobileWs.on('open', checkOpen);
  });

  console.log('✓ Both Desktop and Mobile clients connected successfully to relay server');

  desktopWs.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.type === 'SCAN_DATA') {
      console.log('✓ Desktop received scan data:', JSON.stringify(msg.data));
      desktopReceived = true;
    }
  });

  mobileWs.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.type === 'SCAN_ACK') {
      console.log('✓ Mobile received ACK confirmation from PC:', JSON.stringify(msg));
      mobileAckReceived = true;
    }
  });

  // Send test scan from mobile
  console.log('Transmitting test scan from Mobile...');
  mobileWs.send(JSON.stringify({
    type: 'SCAN_EVENT',
    payload: {
      rawText: 'DS-2CD2143G0-I S/N:HK8819203',
      serialNumber: 'HK8819203',
      model: 'DS-2CD2143G0-I',
      brand: 'Hikvision',
      timestamp: Date.now()
    }
  }));

  await new Promise((resolve) => setTimeout(resolve, 1000));

  desktopWs.close();
  mobileWs.close();

  if (desktopReceived && mobileAckReceived) {
    console.log('\n🎉 ALL TESTS PASSED! Real-time wireless sync verified successfully.');
    process.exit(0);
  } else {
    console.error('❌ Test failed. Desktop received:', desktopReceived, 'Mobile ACK:', mobileAckReceived);
    process.exit(1);
  }
}

testWebSocketFlow().catch(console.error);
