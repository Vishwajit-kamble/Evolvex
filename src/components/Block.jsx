import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  CheckCircle,
  DollarSign,
  FileText,
  User,
  Users,
} from "lucide-react";

import "./style.css";

const BlockFree = () => {
  // State management
  const [account, setAccount] = useState("");
  const [balance, setBalance] = useState(0);
  const [isClient, setIsClient] = useState(true); // Toggle between client and freelancer view
  const [contracts, setContracts] = useState([]);
  const [newContract, setNewContract] = useState({
    title: "",
    description: "",
    amount: "",
    deadline: "",
    freelancerAddress: "",
  });
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "",
  });

  // Mock function to simulate connecting to MetaMask
  const connectWallet = async () => {
    setLoading(true);

    try {
      // In a real implementation, this would use window.ethereum.request({ method: 'eth_requestAccounts' })
      setTimeout(() => {
        const mockAccount =
          "0x" +
          Array(40)
            .fill(0)
            .map(() => Math.floor(Math.random() * 16).toString(16))
            .join("");
        setAccount(mockAccount);
        setBalance(Math.floor(Math.random() * 10000) / 100); // Random balance between 0 and 100 ETH

        // Generate sample contracts for demo
        if (contracts.length === 0) {
          generateSampleContracts(mockAccount);
        }

        showNotification("Wallet connected successfully!", "success");
        setLoading(false);
      }, 1500);
    } catch (error) {
      showNotification("Failed to connect wallet. Please try again.", "error");
      setLoading(false);
    }
  };

  // Generate sample contracts for demonstration
  const generateSampleContracts = (userAccount) => {
    const sampleContracts = [
      {
        id: "1",
        title: "Website Redesign",
        description:
          "Complete redesign of company website with responsive design",
        amount: 2.5,
        deadline: "2025-04-15",
        clientAddress: isClient
          ? userAccount
          : "0x123456789abcdef123456789abcdef123456789a",
        freelancerAddress: isClient
          ? "0x123456789abcdef123456789abcdef123456789a"
          : userAccount,
        status: "pending",
        created: "2025-03-20",
      },
      {
        id: "2",
        title: "Mobile App Development",
        description:
          "Create a cross-platform mobile application for inventory management",
        amount: 5.8,
        deadline: "2025-05-10",
        clientAddress: isClient
          ? userAccount
          : "0x987654321fedcba987654321fedcba987654321f",
        freelancerAddress: isClient
          ? "0x987654321fedcba987654321fedcba987654321f"
          : userAccount,
        status: "in_progress",
        created: "2025-03-15",
      },
    ];

    setContracts(sampleContracts);
  };

  // Handle input changes for new contract form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewContract({
      ...newContract,
      [name]: value,
    });
  };

  // Create new smart contract
  const createContract = (e) => {
    e.preventDefault();
    setLoading(true);

    // In a real implementation, this would interact with the blockchain
    setTimeout(() => {
      const contractId = Math.floor(Math.random() * 1000000).toString();
      const newSmartContract = {
        id: contractId,
        title: newContract.title,
        description: newContract.description,
        amount: parseFloat(newContract.amount),
        deadline: newContract.deadline,
        clientAddress: account,
        freelancerAddress: newContract.freelancerAddress,
        status: "pending",
        created: new Date().toISOString().split("T")[0],
      };

      setContracts([...contracts, newSmartContract]);
      setNewContract({
        title: "",
        description: "",
        amount: "",
        deadline: "",
        freelancerAddress: "",
      });

      showNotification("Smart contract created successfully!", "success");
      setLoading(false);
    }, 2000);
  };

  // Accept a contract (for freelancers)
  const acceptContract = (contractId) => {
    setLoading(true);

    setTimeout(() => {
      const updatedContracts = contracts.map((contract) =>
        contract.id === contractId
          ? { ...contract, status: "in_progress" }
          : contract
      );

      setContracts(updatedContracts);
      showNotification("Contract accepted! Work can now begin.", "success");
      setLoading(false);
    }, 1500);
  };

  // Complete a contract (for freelancers)
  const completeContract = (contractId) => {
    setLoading(true);

    setTimeout(() => {
      const updatedContracts = contracts.map((contract) =>
        contract.id === contractId
          ? { ...contract, status: "completed" }
          : contract
      );

      setContracts(updatedContracts);
      showNotification(
        "Work marked as completed! Awaiting client confirmation.",
        "success"
      );
      setLoading(false);
    }, 1500);
  };

  // Confirm completion and release payment (for clients)
  const releasePayment = (contractId) => {
    setLoading(true);

    setTimeout(() => {
      const contract = contracts.find((c) => c.id === contractId);

      // Update balances (in a real implementation, this would trigger the smart contract)
      setBalance((prevBalance) =>
        parseFloat((prevBalance - contract.amount).toFixed(2))
      );

      const updatedContracts = contracts.map((contract) =>
        contract.id === contractId ? { ...contract, status: "paid" } : contract
      );

      setContracts(updatedContracts);
      showNotification(
        `Payment of ${contract.amount} ETH released successfully!`,
        "success"
      );
      setLoading(false);
    }, 2000);
  };

  // Display notification
  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: "", type: "" });
    }, 5000);
  };

  // Format address for display
  const formatAddress = (address) => {
    if (!address) return "";
    return `${address.substring(0, 6)}...${address.substring(
      address.length - 4
    )}`;
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <h1 className="app-title">EVOLVEX BLOCKFREE</h1>
          <div className="account-area">
            {account ? (
              <div className="account-info">
                <span className="account-address">
                  {formatAddress(account)}
                </span>
                <span className="account-balance">
                  {balance.toFixed(2)} ETH
                </span>
                <button
                  className="switch-role-btn"
                  onClick={() => setIsClient(!isClient)}
                >
                  Switch to {isClient ? "Freelancer" : "Client"}
                </button>
              </div>
            ) : (
              <button
                className="connect-wallet-btn"
                onClick={connectWallet}
                disabled={loading}
              >
                {loading ? "Connecting..." : "Connect Wallet"}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      {account ? (
        <main className="main-content">
          {/* Notification */}
          {notification.show && (
            <div
              className={`notification ${
                notification.type === "success"
                  ? "notification-success"
                  : "notification-error"
              }`}
            >
              <div className="notification-content">
                {notification.type === "success" ? (
                  <CheckCircle className="notification-icon" />
                ) : (
                  <AlertCircle className="notification-icon" />
                )}
                <p>{notification.message}</p>
              </div>
            </div>
          )}

          <div className="dashboard-layout">
            {/* Left Column - Contracts List */}
            <div className="contracts-column">
              <div className="card">
                <h2 className="section-title">
                  {isClient ? "Your Contracts" : "Available Work"}
                </h2>

                {contracts.length > 0 ? (
                  <div className="contracts-list">
                    {contracts.map((contract) => (
                      <div key={contract.id} className="contract-card">
                        <div className="contract-header">
                          <h3 className="contract-title">{contract.title}</h3>
                          <span
                            className={`status-badge status-${contract.status}`}
                          >
                            {contract.status === "pending"
                              ? "Pending"
                              : contract.status === "in_progress"
                              ? "In Progress"
                              : contract.status === "completed"
                              ? "Completed"
                              : "Paid"}
                          </span>
                        </div>

                        <p className="contract-description">
                          {contract.description}
                        </p>

                        <div className="contract-details">
                          <span className="detail-badge">
                            <DollarSign className="detail-icon" />{" "}
                            {contract.amount} ETH
                          </span>
                          <span className="detail-badge">
                            <FileText className="detail-icon" /> Due:{" "}
                            {contract.deadline}
                          </span>
                          <span className="detail-badge">
                            {isClient ? (
                              <User className="detail-icon" />
                            ) : (
                              <Users className="detail-icon" />
                            )}
                            {isClient ? "Freelancer: " : "Client: "}
                            {formatAddress(
                              isClient
                                ? contract.freelancerAddress
                                : contract.clientAddress
                            )}
                          </span>
                        </div>

                        {/* Action buttons based on role and status */}
                        <div className="contract-actions">
                          {!isClient && contract.status === "pending" && (
                            <button
                              className="action-btn accept-btn"
                              onClick={() => acceptContract(contract.id)}
                              disabled={loading}
                            >
                              Accept Contract
                            </button>
                          )}

                          {!isClient && contract.status === "in_progress" && (
                            <button
                              className="action-btn complete-btn"
                              onClick={() => completeContract(contract.id)}
                              disabled={loading}
                            >
                              Mark as Completed
                            </button>
                          )}

                          {isClient && contract.status === "completed" && (
                            <button
                              className="action-btn pay-btn"
                              onClick={() => releasePayment(contract.id)}
                              disabled={loading}
                            >
                              Release Payment
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-data-msg">No contracts found.</p>
                )}
              </div>
            </div>

            {/* Right Column - Create Contract (Client only) */}
            <div className="sidebar-column">
              {isClient && (
                <div className="card">
                  <h2 className="section-title">Create New Contract</h2>

                  <form onSubmit={createContract}>
                    <div className="form-container">
                      <div className="form-group">
                        <label className="form-label">Project Title</label>
                        <input
                          type="text"
                          name="title"
                          value={newContract.title}
                          onChange={handleInputChange}
                          className="form-input"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea
                          name="description"
                          value={newContract.description}
                          onChange={handleInputChange}
                          className="form-textarea"
                          rows="3"
                          required
                        />
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Amount (ETH)</label>
                          <input
                            type="number"
                            name="amount"
                            value={newContract.amount}
                            onChange={handleInputChange}
                            className="form-input"
                            step="0.01"
                            min="0.01"
                            required
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Deadline</label>
                          <input
                            type="date"
                            name="deadline"
                            value={newContract.deadline}
                            onChange={handleInputChange}
                            className="form-input"
                            required
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Freelancer Address</label>
                        <input
                          type="text"
                          name="freelancerAddress"
                          value={newContract.freelancerAddress}
                          onChange={handleInputChange}
                          className="form-input"
                          placeholder="0x..."
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        className="submit-btn"
                        disabled={loading}
                      >
                        {loading ? "Creating..." : "Create Smart Contract"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Freelancer Dashboard (Freelancer only) */}
              {!isClient && (
                <div className="card">
                  <h2 className="section-title">Freelancer Dashboard</h2>

                  <div className="stats-container">
                    <div className="stat-card stat-active">
                      <h3 className="stat-title">Active Contracts</h3>
                      <p className="stat-value">
                        {
                          contracts.filter((c) => c.status === "in_progress")
                            .length
                        }
                      </p>
                    </div>

                    <div className="stat-card stat-pending">
                      <h3 className="stat-title">Pending Offers</h3>
                      <p className="stat-value">
                        {contracts.filter((c) => c.status === "pending").length}
                      </p>
                    </div>

                    <div className="stat-card stat-completed">
                      <h3 className="stat-title">Completed Projects</h3>
                      <p className="stat-value">
                        {contracts.filter((c) => c.status === "paid").length}
                      </p>
                    </div>

                    <div className="stat-card stat-awaiting">
                      <h3 className="stat-title">Awaiting Payment</h3>
                      <p className="stat-value">
                        {
                          contracts.filter((c) => c.status === "completed")
                            .length
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* How It Works */}
            </div>
            <div className="card">
              <h2 className="section-title">How It Works</h2>

              <div className="how-it-works">
                <div className="info-item">
                  <h3 className="info-title">1. Create Smart Contract</h3>
                  <p className="info-text">
                    Clients define project details and allocate funds in escrow.
                  </p>
                </div>

                <div className="info-item">
                  <h3 className="info-title">2. Accept & Work</h3>
                  <p className="info-text">
                    Freelancers accept and complete the project according to
                    specifications.
                  </p>
                </div>

                <div className="info-item">
                  <h3 className="info-title">3. Automatic Payment</h3>
                  <p className="info-text">
                    Funds are released when the client confirms completion.
                  </p>
                </div>

                <div className="info-item">
                  <h3 className="info-title">4. Zero Platform Fees</h3>
                  <p className="info-text">
                    Direct blockchain transactions with minimal gas fees. No
                    intermediaries.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      ) : (
        <div className="landing-container">
          <h2 className="landing-title">Welcome to BlockFree</h2>
          <p className="landing-subtitle">
            The decentralized freelancing platform powered by blockchain
          </p>

          <div className="features-container">
            <div className="feature-card">
              <Users className="feature-icon" />
              <h3 className="feature-title">For Clients</h3>
              <p className="feature-description">
                Post projects with secure escrow payments. No intermediary fees.
                Only pay when work is completed.
              </p>
            </div>

            <div className="feature-card">
              <User className="feature-icon" />
              <h3 className="feature-title">For Freelancers</h3>
              <p className="feature-description">
                Find work with guaranteed payment through smart contracts. Get
                paid instantly upon approval.
              </p>
            </div>
          </div>

          <button
            className="landing-cta-btn"
            onClick={connectWallet}
            disabled={loading}
          >
            {loading ? "Connecting..." : "Connect Wallet to Get Started"}
          </button>
        </div>
      )}
    </div>
  );
};

export default BlockFree;
