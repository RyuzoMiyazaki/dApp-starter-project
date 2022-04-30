import React, {useEffect, useState} from "react";
import './App.css';
/* ethers変数を使えるようにする */
import { ethers } from "ethers";
// ABIファイルを含むWaveportal.jsonファイルをインポートする
import abi from "./utils/WavePortal.json";

const App = () => {
  /* ユーザーのパブリックウォレットを保存するために使用する状態変数を定義します */
  const [currentAccount, setCurrentAccount] = useState("");
  //ユーザーのメッセージを保存するために使用する状態変数を定義
  const [messageValue, setMessageValue] = useState("");
  //全てのwavesを保存する状態変数を定義
  const [allWaves, setAllWaves] = useState([]);
  /* この段階でcurrentAccountの中身は空 */
  console.log("currentAccount: ", currentAccount);

  const contractAddress = "0xbBb30BCC43D846216529383fC59A13b392ab1578";

  const contractABI = abi.abi;

  //コントラクトから全てのwavesを取得するメソッドを作成

  const getAllWaves = async () => {
    const { ethereum } = window;

    try {
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const wavePortalContract = new ethers.Contract(
          contractAddress,
          contractABI,
          signer
        );

        //コントラクトからgetAllWavesメソッドを呼び出す
        const waves = await wavePortalContract.getAllWaves();
        //UIに必要なのは、アドレス、タイムスタンプ、メッセージだけなので、以下のように設定
        const wavesCleaned = waves.map((wave) => {
          return {
            address: wave.waver,
            timestamp: new Date(wave.timestamp * 1000),
            message: wave.message
          };
        });

        //React Stateにデータを格納する
        setAllWaves(wavesCleaned);
      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log(error);
    }
  };

  // emitされたイベントに反応する
  useEffect(() => {
    let wavePortalContract;

    const onNewWave = (from, timestamp, message) => {
      console.log("NewWave", from, timestamp, message);
      setAllWaves((prevState) => [
        ...prevState,
        {
          address: from,
          timestamp: new Date(timestamp * 1000),
          message: message
        },
      ]);
    };

    //NewWaveイベントがコントラクトから発信された時に、情報を受け取る
    if (window.ethereum) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      wavePortalContract = new ethers.Contract(
        contractAddress,
        contractABI,
        signer
      );
      wavePortalContract.on("NewWave", onNewWave);
    }
    //メモリリークを防ぐために、NewWaveのイベントを解除します
    return () => {
      if (wavePortalContract) {
        wavePortalContract.off("NewWave", onNewWave);
      }
    };
  }, [contractABI]);
  
  /* window.window.ethereumにアクセスできることを確認します。 */
  const checkIfWalletIsConnected = async() => {
    try {
      const { ethereum } = window;
      if (!ethereum) {
        console.log("Make sure you have MetaMask!");
        return;
      } else {
        console.log("We have the ethereum object", ethereum);
      }
      /* ユーザーのウォレットへのアクセスが強化されているかどうかを確認します */
      //accountsにWEBサイトを訪れたユーザーのウォレットアカウントを格納する（複数持っている場合も加味、よってaccount's'と変数を定義している）
      const accounts = await ethereum.request({method: "eth_accounts" });
      //もしアカウントをひとつでも存在したら、以下を実行
      if (accounts.length !== 0) {
        //accountという変数にユーザーの１つ目（Javascriptでいう0番目）のアドレスを格納
        const account = accounts[0];
        console.log("Found an authorized account:", account);
        //currentAccountにユーザーのアカウントアドレスを格納
        setCurrentAccount(account);
        getAllWaves();
      } else {
        //アカウントが存在しない場合は、エラーを出力
        console.log("No authorized account found");
      }
    } catch (error) {
      console.log(error);
    }
  };
  // connectWalletメソッドを実装
  const connectWallet = async () => {
    try {
      //ユーザーが認証可能なウォレットアドレスを持っているか確認
      const { ethereum } = window;
      if (!ethereum) {
        alert("Get MetaMask!");
        return;
      }
      //持っている場合は、ユーザーに対してウォレットのアクセス許可を求める。許可されれば、ユーザーの最初のウォレットアドレスをcurrentAccountに格納する
      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });
      console.log("Connected: ", accounts[0]);
      setCurrentAccount(accounts[0]);
    } catch (error) {
      console.log(error);
    }
  };
  //waveの回数をカウントする関数を実装
  const wave = async () => {
    try {
      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const wavePortalContract = new ethers.Contract(
          contractAddress,
          contractABI,
          signer
        );
        let count = await wavePortalContract.getTotalWaves();
        console.log("Retrieved total wave count...", count.toNumber());

        const contractBalance = await provider.getBalance(wavePortalContract.address);
        console.log("Contract balance:", ethers.utils.formatEther(contractBalance));

        // コントラクトにWaveを書き込む
        const waveTxn = await wavePortalContract.wave(messageValue, {
          gasLimit: 300000,
        });
        console.log("Mining ...", waveTxn.hash);
        await waveTxn.wait();
        console.log("Mined --", waveTxn.hash);
        count = await wavePortalContract.getTotalWaves();
        console.log("Retrieved total wave count...", count.toNumber()); 

        let contractBalance_post = await provider.getBalance(
          wavePortalContract.address
        );

        // コントラクトの残高が減っていることを確認
        if(contractBalance_post < contractBalance) {
          //減っていたら下記を出力
          console.log("User won ETH!");
        } else {
          console.log("User didn't win ETH.");
        }
        console.log(
          "Contract balance after wave:",
          ethers.utils.formatEther(contractBalance_post)
        );
      } else {
        console.log("Ethereum object doesn't exist!");
      } 
    } catch (error) {
      console.log(error);
    }
  };

  /* WEBページがロードされた時に下記の関数を実行します */
  useEffect(() => {
    checkIfWalletIsConnected();
  }, [contractABI]);
  return (
    <div className = "mainContainer">
      <div className = "dataContainer">
        <div className = "header">
          <span role = "img" aria-label = "hand-wave">
            👋
          </span>{" "}
            WELCOME!
        </div>
        <div className = "bio">
          イーサリアムを接続して、メッセージを作成したら、「
          <span role = "img" aria-label = "hand-wave">
            👋
          </span>
          (wave)」を送ってください
          <span role = "img" aria-label = "shine">
            ✨
          </span>
        </div>
        <br />
        {/* ウォレットコネクトのボタンを実装 */}
        {/*currentAccountが存在しない場合は、「Connect Wallet」ボタンを実装 */}
        {
          !currentAccount && (
            <button className = "waveButton" onClick = {connectWallet}>
              Connect Wallet 
            </button>
          )
        }
        {/*currentAccountが存在する場合は、「Wallet　Connected」ボタンを実装 */}
        {
          currentAccount && (
            <button className = "waveButton" onClick = {connectWallet}>
              Wallet Connected
            </button>
          )
        }
        {/* waveボタンにwave関数を連動*/}
        {currentAccount && (
          <button className = "waveButton" onClick = {wave}>
            Wave at Me
          </button>
          )
        }
        {/* メッセージボックスを実装　*/}
        {currentAccount && (
          <textarea
            name = "messageArea"
            placeholder = "メッセージはこちら"
            type = "text"
            id = "message"
            value = {messageValue}
            onChange = {(e) => setMessageValue(e.target.value)}
          />
          )
        }
        {/* 履歴を表示する */}
        {currentAccount && 
          allWaves
            .slice(0)
            .reverse()
            .map((wave, index) => {
              return (
                <div
                  key = {index}
                  style = {{
                    backgroundColor: "#F8F8FF",
                    marginTop: "16px",
                    padding: "8px",
                  }}
                >
                  <div>Address: {wave.address}</div>
                  <div>Time: {wave.timestamp.toString()}</div>
                  <div>Message: {wave.message}</div>
                </div>
              );
            })
        }
      </div>
    </div>
  );
};
export default App;
