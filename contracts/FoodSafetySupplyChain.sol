// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

contract FoodSafetySupplyChain {
    enum Role { NONE, ADMIN, FARMER, PROCESSOR, DISTRIBUTOR, RETAILER, CUSTOMER }
    enum Status { CREATED, PROCESSED, IN_DISTRIBUTION, AT_RETAILER, SOLD, RECALLED }
    enum Stage { FARMING, PROCESSING, DISTRIBUTION, RETAIL, SALE, RECALL }

    struct Participant { string name; string location; Role role; bool active; uint256 registeredAt; }

    struct Product {
        uint256 id; string batchId; string productName;
        address farmer; address processor; address distributor; address retailer; address customer;
        string origin; string harvestDate; string expiryDate;
        uint256 qualityScore;
        string imageCID; string qualityCID; string safetyCID; string documentCID;
        Status status;
        uint256 createdAt; uint256 processedAt; uint256 distributedAt; uint256 retailerAt; uint256 soldAt; uint256 recalledAt;
    }

    struct History { Stage stage; address participant; string location; string remarks; string ipfsCID; uint256 timestamp; }

    address public admin;
    uint256 public participantCount;
    uint256 public productCount;

    mapping(address => Participant) public participants;
    mapping(address => bool) public registered;
    mapping(uint256 => Product) public products;
    mapping(string => uint256) public batchToProduct;
    mapping(uint256 => History[]) private history;
    mapping(address => uint256[]) private customerProducts;

    event ParticipantRegistered(address indexed wallet, string name, Role role);
    event ParticipantStatusChanged(address indexed wallet, bool active);
    event ProductRegistered(uint256 indexed productId, string batchId, address farmer);
    event ProductProcessed(uint256 indexed productId, address processor);
    event ProductDistributed(uint256 indexed productId, address distributor);
    event ProductRetail(uint256 indexed productId, address retailer);
    event ProductSold(uint256 indexed productId, address customer);
    event ProductRecalled(uint256 indexed productId, address recalledBy);
    event CertificateAdded(uint256 indexed productId, uint8 certificateType, string cid);
    event HistoryAdded(uint256 indexed productId, Stage stage, address participant);

    modifier onlyAdmin() { require(msg.sender == admin, "Only admin"); _; }

    modifier activeUser() {
        require(registered[msg.sender], "Not registered");
        require(participants[msg.sender].active, "Inactive user");
        _;
    }

    modifier roleOnly(Role role) {
        require(registered[msg.sender], "Not registered");
        require(participants[msg.sender].active, "Inactive user");
        require(participants[msg.sender].role == role, "Wrong role");
        _;
    }

    modifier validProduct(uint256 productId) {
        require(productId > 0 && productId <= productCount, "Product not found");
        _;
    }

    constructor() {
        admin = msg.sender;
        participants[msg.sender] = Participant("System Administrator", "System", Role.ADMIN, true, block.timestamp);
        registered[msg.sender] = true;
        participantCount = 1;
    }

    // ---------------- PARTICIPANT MANAGEMENT ----------------

    function registerParticipant(address wallet, string calldata name, string calldata location, Role role) external onlyAdmin {
        require(wallet != address(0), "Invalid address");
        require(!registered[wallet], "Already registered");
        require(role != Role.NONE, "Invalid role");
        require(role != Role.ADMIN, "Cannot create admin");
        participants[wallet] = Participant(name, location, role, true, block.timestamp);
        registered[wallet] = true;
        participantCount++;
        emit ParticipantRegistered(wallet, name, role);
    }

    function deactivateParticipant(address wallet) external onlyAdmin {
        require(registered[wallet], "Not registered");
        require(wallet != admin, "Cannot deactivate admin");
        participants[wallet].active = false;
        emit ParticipantStatusChanged(wallet, false);
    }

    function activateParticipant(address wallet) external onlyAdmin {
        require(registered[wallet], "Not registered");
        participants[wallet].active = true;
        emit ParticipantStatusChanged(wallet, true);
    }

    function getParticipant(address wallet) external view returns (string memory name, string memory location, Role role, bool active, uint256 registeredAt) {
        Participant memory p = participants[wallet];
        return (p.name, p.location, p.role, p.active, p.registeredAt);
    }

    function getRole(address wallet) external view returns (Role) { return participants[wallet].role; }

    // ---------------- REGISTER PRODUCT ----------------

    function registerProduct(
        string calldata batchId, string calldata productName, string calldata origin,
        string calldata harvestDate, string calldata expiryDate, uint256 qualityScore, string calldata imageCID
    ) external roleOnly(Role.FARMER) returns (uint256) {
        require(bytes(batchId).length > 0, "Batch required");
        require(batchToProduct[batchId] == 0, "Batch exists");
        require(qualityScore <= 100, "Score must be 0-100");

        productCount++;
        Product storage p = products[productCount];
        p.id = productCount;
        p.batchId = batchId;
        p.productName = productName;
        p.farmer = msg.sender;
        p.origin = origin;
        p.harvestDate = harvestDate;
        p.expiryDate = expiryDate;
        p.qualityScore = qualityScore;
        p.imageCID = imageCID;
        p.status = Status.CREATED;
        p.createdAt = block.timestamp;
        batchToProduct[batchId] = productCount;

        emit ProductRegistered(productCount, batchId, msg.sender);
        _addHistory(productCount, Stage.FARMING, participants[msg.sender].location, "Product registered", imageCID);
        return productCount;
    }

    // ---------------- SUPPLY CHAIN FLOW ----------------

    function processProduct(uint256 productId) external roleOnly(Role.PROCESSOR) validProduct(productId) {
        Product storage p = products[productId];
        require(p.status == Status.CREATED, "Invalid status");
        p.processor = msg.sender;
        p.status = Status.PROCESSED;
        p.processedAt = block.timestamp;
        emit ProductProcessed(productId, msg.sender);
        _addHistory(productId, Stage.PROCESSING, participants[msg.sender].location, "Product processed", "");
    }

    function transferToDistributor(uint256 productId, address distributor) external roleOnly(Role.PROCESSOR) validProduct(productId) {
        Product storage p = products[productId];
        require(p.status == Status.PROCESSED, "Invalid status");
        require(p.processor == msg.sender, "Not assigned processor");
        require(distributor != address(0), "Invalid distributor");
        require(registered[distributor], "Distributor not registered");
        require(participants[distributor].role == Role.DISTRIBUTOR, "Not distributor");
        require(participants[distributor].active, "Distributor inactive");
        p.distributor = distributor;
        p.status = Status.IN_DISTRIBUTION;
        p.distributedAt = block.timestamp;
        emit ProductDistributed(productId, distributor);
        _addHistory(productId, Stage.DISTRIBUTION, participants[distributor].location, "Transferred to distributor", "");
    }

    function transferToRetailer(uint256 productId, address retailer) external roleOnly(Role.DISTRIBUTOR) validProduct(productId) {
        Product storage p = products[productId];
        require(p.status == Status.IN_DISTRIBUTION, "Invalid status");
        require(p.distributor == msg.sender, "Not assigned distributor");
        require(retailer != address(0), "Invalid retailer");
        require(registered[retailer], "Retailer not registered");
        require(participants[retailer].role == Role.RETAILER, "Not retailer");
        require(participants[retailer].active, "Retailer inactive");
        p.retailer = retailer;
        p.status = Status.AT_RETAILER;
        p.retailerAt = block.timestamp;
        emit ProductRetail(productId, retailer);
        _addHistory(productId, Stage.RETAIL, participants[retailer].location, "Product received by retailer", "");
    }

    function sellToCustomer(uint256 productId, address customer) external roleOnly(Role.RETAILER) validProduct(productId) {
        Product storage p = products[productId];
        require(p.status == Status.AT_RETAILER, "Invalid status");
        require(p.retailer == msg.sender, "Not assigned retailer");
        require(customer != address(0), "Invalid customer");
        require(registered[customer], "Customer not registered");
        require(participants[customer].role == Role.CUSTOMER, "Not customer");
        require(participants[customer].active, "Customer inactive");
        require(p.customer == address(0), "Already sold");
        p.customer = customer;
        p.status = Status.SOLD;
        p.soldAt = block.timestamp;
        customerProducts[customer].push(productId);
        emit ProductSold(productId, customer);
        _addHistory(productId, Stage.SALE, participants[msg.sender].location, "Product sold to customer", "");
    }

    // ---------------- CERTIFICATES (1=Quality, 2=Food Safety, 3=Additional) ----------------

    function addCertificate(uint256 productId, uint8 certificateType, string calldata cid) external validProduct(productId) {
        Product storage p = products[productId];
        require(registered[msg.sender], "Not registered");
        require(participants[msg.sender].active, "Inactive user");
        require(bytes(cid).length > 0, "CID required");
        require(certificateType >= 1 && certificateType <= 3, "Invalid certificate");

        bool authorized = msg.sender == admin || msg.sender == p.farmer || msg.sender == p.processor;
        if (certificateType == 3) {
            authorized = authorized || msg.sender == p.distributor || msg.sender == p.retailer;
        }
        require(authorized, "Not authorized");

        if (certificateType == 1) { p.qualityCID = cid; }
        else if (certificateType == 2) { p.safetyCID = cid; }
        else { p.documentCID = cid; }
        emit CertificateAdded(productId, certificateType, cid);
    }

    // ---------------- HISTORY ----------------

    function addHistory(uint256 productId, Stage stage, string calldata location, string calldata remarks, string calldata ipfsCID)
        external activeUser validProduct(productId)
    {
        _addHistory(productId, stage, location, remarks, ipfsCID);
    }

    function _addHistory(uint256 productId, Stage stage, string memory location, string memory remarks, string memory ipfsCID) internal {
        history[productId].push(History(stage, msg.sender, location, remarks, ipfsCID, block.timestamp));
        emit HistoryAdded(productId, stage, msg.sender);
    }

    function getHistoryCount(uint256 productId) external view returns (uint256) { return history[productId].length; }

    function getHistoryRecord(uint256 productId, uint256 index) external view returns (
        Stage stage, address participant, string memory location, string memory remarks, string memory ipfsCID, uint256 timestamp
    ) {
        require(index < history[productId].length, "Invalid index");
        History memory h = history[productId][index];
        return (h.stage, h.participant, h.location, h.remarks, h.ipfsCID, h.timestamp);
    }

    // ---------------- RECALL ----------------

    function recallProduct(uint256 productId) external validProduct(productId) {
        Product storage p = products[productId];
        require(registered[msg.sender], "Not registered");
        require(participants[msg.sender].active, "Inactive user");
        require(
            msg.sender == admin || msg.sender == p.farmer || msg.sender == p.processor ||
            msg.sender == p.distributor || msg.sender == p.retailer,
            "Not authorized"
        );
        require(p.status != Status.RECALLED, "Already recalled");
        p.status = Status.RECALLED;
        p.recalledAt = block.timestamp;
        emit ProductRecalled(productId, msg.sender);
        _addHistory(productId, Stage.RECALL, participants[msg.sender].location, "Product recalled", "");
    }

    // ---------------- VERIFICATION & VIEWS ----------------

    function verifyProduct(uint256 productId) external view returns (bool exists, Status status, uint256 qualityScore) {
        if (productId == 0 || productId > productCount) return (false, Status.CREATED, 0);
        Product storage p = products[productId];
        return (true, p.status, p.qualityScore);
    }

    function verifyBatch(string calldata batchId) external view returns (bool exists, uint256 productId, Status status) {
        productId = batchToProduct[batchId];
        if (productId == 0) return (false, 0, Status.CREATED);
        return (true, productId, products[productId].status);
    }

    function getCustomerProductCount(address customer) external view returns (uint256) { return customerProducts[customer].length; }

    function getCustomerProduct(address customer, uint256 index) external view returns (uint256) {
        require(index < customerProducts[customer].length, "Invalid index");
        return customerProducts[customer][index];
    }

    function getProductBasic(uint256 productId) external view validProduct(productId) returns (
        string memory batchId, string memory productName, Status status, uint256 qualityScore, string memory origin, string memory expiryDate
    ) {
        Product storage p = products[productId];
        return (p.batchId, p.productName, p.status, p.qualityScore, p.origin, p.expiryDate);
    }

    function getProductParticipants(uint256 productId) external view validProduct(productId) returns (
        address farmer, address processor, address distributor, address retailer, address customer
    ) {
        Product storage p = products[productId];
        return (p.farmer, p.processor, p.distributor, p.retailer, p.customer);
    }

    function getProductCertificates(uint256 productId) external view validProduct(productId) returns (
        string memory imageCID, string memory qualityCID, string memory safetyCID, string memory documentCID
    ) {
        Product storage p = products[productId];
        return (p.imageCID, p.qualityCID, p.safetyCID, p.documentCID);
    }

    function getProductTimes(uint256 productId) external view validProduct(productId) returns (
        uint256 createdAt, uint256 processedAt, uint256 distributedAt, uint256 retailerAt, uint256 soldAt, uint256 recalledAt
    ) {
        Product storage p = products[productId];
        return (p.createdAt, p.processedAt, p.distributedAt, p.retailerAt, p.soldAt, p.recalledAt);
    }

    function getProductIdByBatch(string calldata batchId) external view returns (uint256) { return batchToProduct[batchId]; }
}
