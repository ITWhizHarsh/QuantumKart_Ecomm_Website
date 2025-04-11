import React from 'react';
import utilStyles from '../../../App/utilStyles.module.css';

interface Review {
  id: string;
  productName: string;
  customerName: string;
  rating: number;
  comment: string;
  date: string;
}

const ReviewsSection: React.FC = () => {
  // Mock data for reviews
  const reviews: Review[] = [
    {
      id: '1',
      productName: 'Sample Product 1',
      customerName: 'John Doe',
      rating: 5,
      comment: 'Great product, exactly as described. Would buy again!',
      date: '2023-06-15'
    },
    {
      id: '2',
      productName: 'Sample Product 2',
      customerName: 'Jane Smith',
      rating: 4,
      comment: 'Very good quality. Arrived quickly. Just missing some instructions.',
      date: '2023-06-10'
    },
    {
      id: '3',
      productName: 'Sample Product 1',
      customerName: 'Mike Johnson',
      rating: 3,
      comment: 'Decent product but not as durable as I hoped.',
      date: '2023-06-05'
    }
  ];

  // Helper function to render stars based on rating
  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        stars.push(<span key={i} style={{ color: 'gold' }}>★</span>);
      } else {
        stars.push(<span key={i} style={{ color: 'gray' }}>★</span>);
      }
    }
    return stars;
  };

  return (
    <div className={utilStyles.container}>
      <h2 className={utilStyles.h2}>Customer Reviews</h2>
      
      {reviews.length === 0 ? (
        <p className={utilStyles.emptyFeedMessage}>No reviews yet.</p>
      ) : (
        <div>
          {reviews.map(review => (
            <div key={review.id} style={{ 
              padding: '15px', 
              marginBottom: '15px', 
              border: '1px solid #eee', 
              borderRadius: '8px' 
            }}>
              <h3>{review.productName}</h3>
              <div>{renderStars(review.rating)}</div>
              <p><strong>By {review.customerName}</strong> on {new Date(review.date).toLocaleDateString()}</p>
              <p>{review.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewsSection; 